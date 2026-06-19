from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Dict, Any

from ..schemas.copilot import CopilotBriefingRequest, CopilotBriefingResponse
from .gemini_client import generate_copilot_briefing

logger = logging.getLogger(__name__)


def generate_fallback_briefing(request: CopilotBriefingRequest) -> CopilotBriefingResponse:
    """Generate a high-quality rule-based briefing when Gemini is unavailable."""
    impact = request.prediction.impact_level
    cause = request.event_metadata.event_cause.replace("_", " ").title()
    junction = request.event_metadata.junction.replace("-", " ").title()
    zone = request.event_metadata.zone
    officers = request.resource_plan.officers_required
    vehicles = request.resource_plan.patrol_vehicles
    barricades = request.resource_plan.barricades
    
    delay_red = "0%"
    vehicles_div = 0
    if request.diversion_plan:
        delay_red = request.diversion_plan.estimated_delay_reduction or "0%"
        vehicles_div = request.diversion_plan.estimated_vehicles_diverted or 0

    timestamp_str = datetime.now().isoformat()

    if impact == "Low":
        summary = f"Low congestion impact is forecasted near {junction} due to {cause}. The situation is stable under standard monitoring."
        risks = [
            "Minor localized slow-downs near event perimeter",
            "Slight increase in travel time through the intersection",
            "Pedestrian accumulation near sidewalks"
        ]
        actions = [
            "Standard monitoring of junction via CCTV",
            f"Deploy {officers} officers for routine guidance",
            "Maintain regular traffic signal timings"
        ]
        comm_briefing = f"Routine operational status at {junction} ({zone} Zone). Low impact predicted for {cause}. Deploying standard monitoring with {officers} officers. No major delays or route blocks anticipated."
        citizen_advisory = f"Traffic flow at {junction} is normal. Standard activity expected due to {cause}. Drive safely."

    elif impact == "Medium":
        summary = f"Moderate congestion is expected near {junction} due to {cause}. Increased patrols will be deployed to manage flow."
        risks = [
            "Moderate delay backlog on approach roads",
            "Slight delay in emergency vehicle access if lanes narrow",
            "Double parking and curb congestion near the venue"
        ]
        actions = [
            f"Deploy {officers} officers and {vehicles} patrol vehicles",
            "Active manual overrides on traffic signals during peak hours",
            "Deploy temporary signboards to guide drivers"
        ]
        comm_briefing = f"Moderate congestion is forecasted at {junction} due to {cause}. Deploying {officers} officers and {vehicles} patrol vehicles for active traffic management. Expect minor signal delays."
        citizen_advisory = f"Moderate delays expected near {junction} due to {cause}. Please plan ahead and allow extra travel time."

    elif impact == "High":
        summary = f"High congestion is predicted near {junction} due to {cause}. Diversions and barricades will be implemented to prevent gridlock."
        risks = [
            "Significant queue spillover to adjacent junctions",
            "Reduced speeds across the {zone} zone arterial network",
            "Restricted commercial vehicle movement"
        ]
        actions = [
            f"Deploy {officers} officers and set up {barricades} barricades",
            "Activate Diversion Route plan to reroute vehicles",
            "Issue local public alerts via advisory channels"
        ]
        comm_briefing = f"High impact event ({cause}) is predicted near {junction}. Proactive deployment of {officers} officers, {barricades} barricades, and diversions is recommended to mitigate gridlock. Delay reduction of {delay_red} expected."
        citizen_advisory = f"High traffic alert: Diversions and barricades are active near {junction} due to {cause}. Expect significant delays; use alternate routes."

    else:  # Critical / default
        summary = f"Critical traffic disruption is imminent near {junction} due to a high-priority {cause}. Full operational response is activated."
        risks = [
            f"Complete gridlock at {junction} spreading to {zone} zone arterials",
            "Severe response times for emergency vehicles without intervention",
            "High safety risk due to heavy pedestrian-vehicle conflict"
        ]
        actions = [
            f"Deploy full operational response: {officers} officers, {vehicles} patrols, and {barricades} barricades",
            "Activate emergency corridors to preserve ambulance movement",
            "Implement major diversion plans immediately to divert traffic",
            "Issue urgent media and public advisory warnings"
        ]
        comm_briefing = f"CRITICAL traffic alert: High-priority {cause} near {junction} requires immediate full operational response. Deploying {officers} officers, emergency corridors, and major diversions. Action targets an estimated {delay_red} delay reduction."
        citizen_advisory = f"CRITICAL TRAFFIC WARNING: Avoid {junction} area entirely. Severe delays, barricades, and road diversions are active due to {cause}. Emergency vehicles only."

    return CopilotBriefingResponse(
        summary=summary,
        risks=risks,
        actions=actions,
        confidence=request.prediction.confidence,
        generated_by="fallback",
        timestamp=timestamp_str,
        commissioner_briefing=comm_briefing,
        citizen_advisory=citizen_advisory
    )


def generate_executive_briefing(request: CopilotBriefingRequest) -> CopilotBriefingResponse:
    """Generate briefing using Gemini with a robust rule-based fallback."""
    # Build list of feature contributions for prompt
    shap_factors = ", ".join([f"{f.feature} ({f.contribution:+.1f}%)" for f in request.feature_contributions])

    cause = request.event_metadata.event_cause.replace("_", " ").title()
    junction = request.event_metadata.junction.replace("-", " ").title()
    zone = request.event_metadata.zone

    delay_red = "0%"
    vehicles_div = 0
    if request.diversion_plan:
        delay_red = request.diversion_plan.estimated_delay_reduction or "0%"
        vehicles_div = request.diversion_plan.estimated_vehicles_diverted or 0

    # Build prompt template
    prompt = f"""You are the AI Traffic Commander, a senior traffic operations copilot.
Analyze the following operational inputs and generate a structured JSON response.
The output MUST be a JSON object with EXACTLY the following keys (no markdown formatting, no code blocks):
{{
  "summary": "A concise operational executive summary (max 3 sentences).",
  "risks": ["Risk statement 1", "Risk statement 2", "Risk statement 3"],
  "actions": ["Actionable deployment 1", "Actionable deployment 2", "Actionable deployment 3"],
  "commissioner_briefing": "A one-paragraph executive briefing suitable for presentation to senior officials.",
  "citizen_advisory": "A simplified public-facing explanation suitable for alerts and notifications."
}}

RULES:
- Use only the provided data. Do not hallucinate or add ungrounded details.
- Tone: Professional, operational, concise, emergency-management style.
- Output MUST be valid JSON. Do not wrap the JSON in ```json or ``` blocks.

INPUT DATA:
- Event: {request.event_metadata.event_type} {cause} in {zone} zone at {junction} junction.
- Attendance: {request.event_metadata.attendance} people, Duration: {request.event_metadata.duration} hours, Start: {request.event_metadata.start_time}.
- ML Prediction: {request.prediction.impact_level} impact level with {request.prediction.confidence}% confidence.
- Local SHAP Factors: {shap_factors}
- Resources: deployment score {request.resource_plan.deployment_score}/100, {request.resource_plan.officers_required} officers, {request.resource_plan.patrol_vehicles} patrol vehicles, {request.resource_plan.barricades} barricades, {request.resource_plan.diversion_level} diversion level, emergency corridor required: {request.resource_plan.emergency_corridor_required}.
- Diversion: estimated delay reduction: {delay_red}, estimated vehicles diverted: {vehicles_div}.
"""

    gemini_output = generate_copilot_briefing(prompt)

    if gemini_output:
        try:
            # Clean up potential markdown blocks if LLM ignored instructions
            cleaned = gemini_output.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```json") or lines[0] == "```":
                    lines = lines[1:]
                if lines and lines[-1] == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()

            parsed = json.loads(cleaned)
            return CopilotBriefingResponse(
                summary=parsed["summary"],
                risks=parsed["risks"],
                actions=parsed["actions"],
                confidence=request.prediction.confidence,
                generated_by="gemini",
                timestamp=datetime.now().isoformat(),
                commissioner_briefing=parsed.get("commissioner_briefing"),
                citizen_advisory=parsed.get("citizen_advisory")
            )
        except Exception as e:
            logger.error(f"Failed to parse Gemini output: {e}. Output was: {gemini_output}")

    logger.warning("Gemini briefing failed or unavailable. Invoking rule-based fallback.")
    return generate_fallback_briefing(request)
