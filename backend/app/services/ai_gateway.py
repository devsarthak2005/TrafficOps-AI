from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional

# pyrefly: ignore [missing-import]
import google.generativeai as genai

from ..config import (
    AI_CACHE_TTL_SECONDS,
    AI_DEDUPE_WAIT_SECONDS,
    AI_FAILURE_COOLDOWN_SECONDS,
    AI_MAX_CACHE_ENTRIES,
    AI_MAX_COOLDOWN_SECONDS,
    AI_QUOTA_COOLDOWN_SECONDS,
    AI_REQUEST_TIMEOUT_SECONDS,
    ENABLE_GEMINI,
    GEMINI_API_KEY,
    GEMINI_MODEL,
)

logger = logging.getLogger(__name__)


@dataclass
class _CacheEntry:
    value: Optional[str]
    expires_at: float
    source: str


@dataclass
class _BreakerState:
    consecutive_failures: int = 0
    open_until: float = 0.0
    last_error_type: str = "none"
    last_error_at: float = 0.0


_lock = threading.RLock()
_cache: "OrderedDict[str, _CacheEntry]" = OrderedDict()
_inflight: dict[str, threading.Event] = {}
_breaker = _BreakerState()


def _now() -> float:
    return time.time()


def _log_ai_event(event: str, level: int = logging.INFO, **fields: object) -> None:
    payload = {
        "event": event,
        "model": GEMINI_MODEL,
        "enabled": ENABLE_GEMINI,
        **fields,
    }
    logger.log(level, "ai_gateway %s", json.dumps(payload, sort_keys=True, default=str))


def reset_ai_gateway_state() -> None:
    """Reset in-memory cache/breaker state for tests."""
    with _lock:
        _cache.clear()
        _inflight.clear()
        _breaker.consecutive_failures = 0
        _breaker.open_until = 0.0
        _breaker.last_error_type = "none"
        _breaker.last_error_at = 0.0


def _is_enabled() -> bool:
    return ENABLE_GEMINI and bool(GEMINI_API_KEY)


def _cache_key(
    prompt: str,
    *,
    max_output_tokens: int,
    temperature: float,
    response_mime_type: str | None,
) -> str:
    fingerprint = "|".join(
        [
            GEMINI_MODEL,
            str(max_output_tokens),
            f"{temperature:.3f}",
            response_mime_type or "text/plain",
            prompt,
        ]
    )
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()


def _prune_cache(now: float) -> None:
    expired = [key for key, entry in _cache.items() if entry.expires_at <= now]
    for key in expired:
        _cache.pop(key, None)

    while len(_cache) > AI_MAX_CACHE_ENTRIES:
        _cache.popitem(last=False)


def _is_rate_limit_error(exc: Exception) -> bool:
    text = f"{exc.__class__.__name__}: {exc}".lower()
    keywords = (
        "429",
        "quota",
        "rate limit",
        "ratelimit",
        "resourceexhausted",
        "too many requests",
        "exceeded your current quota",
    )
    return any(keyword in text for keyword in keywords)


def _set_breaker_open(now: float, *, rate_limited: bool, error: Exception) -> float:
    base_cooldown = AI_QUOTA_COOLDOWN_SECONDS if rate_limited else AI_FAILURE_COOLDOWN_SECONDS
    failures = _breaker.consecutive_failures + 1
    cooldown = min(AI_MAX_COOLDOWN_SECONDS, base_cooldown * (2 ** max(0, failures - 1)))

    _breaker.consecutive_failures = failures
    _breaker.open_until = now + cooldown
    _breaker.last_error_type = "rate_limit" if rate_limited else "error"
    _breaker.last_error_at = now

    _log_ai_event(
        "breaker_open",
        logging.WARNING,
        consecutive_failures=failures,
        cooldown_seconds=cooldown,
        open_until=_breaker.open_until,
        error_type=_breaker.last_error_type,
        error_message=str(error),
    )
    return cooldown


def _record_success(now: float) -> None:
    if _breaker.consecutive_failures or _breaker.open_until:
        _log_ai_event(
            "breaker_close",
            logging.INFO,
            consecutive_failures=_breaker.consecutive_failures,
            last_error_type=_breaker.last_error_type,
        )
    _breaker.consecutive_failures = 0
    _breaker.open_until = 0.0
    _breaker.last_error_type = "none"
    _breaker.last_error_at = now


def _cache_result(key: str, value: str, source: str, ttl_seconds: int) -> None:
    expires_at = _now() + ttl_seconds
    _cache[key] = _CacheEntry(value=value, expires_at=expires_at, source=source)
    _cache.move_to_end(key)


def _cache_failure(key: str, ttl_seconds: int) -> None:
    expires_at = _now() + ttl_seconds
    _cache[key] = _CacheEntry(value=None, expires_at=expires_at, source="fallback")
    _cache.move_to_end(key)


def request_gemini_text(
    prompt: str,
    *,
    task_name: str,
    max_output_tokens: int,
    temperature: float,
    response_mime_type: str | None = None,
    timeout_seconds: float | None = None,
) -> Optional[str]:
    """Request text from Gemini with caching, dedupe, and circuit breaking."""
    if not _is_enabled():
        _log_ai_event("disabled", logging.INFO, task=task_name)
        return None

    timeout_seconds = timeout_seconds or AI_REQUEST_TIMEOUT_SECONDS
    key = _cache_key(
        prompt,
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        response_mime_type=response_mime_type,
    )
    now = _now()

    with _lock:
        _prune_cache(now)
        cached = _cache.get(key)
        if cached and cached.expires_at > now:
            _log_ai_event("cache_hit", logging.INFO, task=task_name, cache_source=cached.source)
            return cached.value

        if _breaker.open_until > now:
            remaining = round(_breaker.open_until - now, 2)
            _log_ai_event(
                "breaker_open_skip",
                logging.WARNING,
                task=task_name,
                remaining_seconds=remaining,
                error_type=_breaker.last_error_type,
            )
            return None

        waiter = _inflight.get(key)
        if waiter is None:
            waiter = threading.Event()
            _inflight[key] = waiter
            owner = True
        else:
            owner = False

    if not owner:
        waiter.wait(timeout=AI_DEDUPE_WAIT_SECONDS)
        with _lock:
            cached = _cache.get(key)
            if cached and cached.expires_at > _now():
                _log_ai_event("dedupe_cache_hit", logging.INFO, task=task_name, cache_source=cached.source)
                return cached.value
            if _breaker.open_until > _now():
                return None
        return None

    try:
        _log_ai_event(
            "request_start",
            logging.INFO,
            task=task_name,
            timeout_seconds=timeout_seconds,
            cache_key=key[:12],
        )
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_output_tokens,
                temperature=temperature,
                **({"response_mime_type": response_mime_type} if response_mime_type else {}),
            ),
            request_options={"timeout": timeout_seconds},
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Gemini returned an empty response")

        with _lock:
            _cache_result(key, text, "gemini", AI_CACHE_TTL_SECONDS)
            _record_success(_now())

        _log_ai_event("request_success", logging.INFO, task=task_name, cache_key=key[:12], response_chars=len(text))
        return text
    except Exception as exc:
        now = _now()
        rate_limited = _is_rate_limit_error(exc)
        cooldown = _set_breaker_open(now, rate_limited=rate_limited, error=exc)
        with _lock:
            _cache_failure(key, cooldown)

        _log_ai_event(
            "request_failure",
            logging.ERROR if rate_limited else logging.WARNING,
            task=task_name,
            cache_key=key[:12],
            rate_limited=rate_limited,
            cooldown_seconds=cooldown,
            error_message=str(exc),
        )
        return None
    finally:
        with _lock:
            event = _inflight.pop(key, None)
            if event is not None:
                event.set()


if _is_enabled():
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        _log_ai_event("configured", logging.INFO)
    except Exception as exc:
        logger.error("Failed to configure Gemini SDK: %s", exc)
else:
    logger.info("Gemini disabled or key missing; gateway will use fallbacks only.")
