/**
 * Status color utilities — single source of truth.
 *
 * Every component that needs a status color (markers, badges, sidebar zone
 * bars) imports from here. Never duplicate the mapping.
 *
 * Uses the Phase 1 design-system tokens defined in tailwind.config.ts.
 */

export type RiskCategory = "healthy" | "moderate" | "watchlist" | "critical";

// ── Tailwind class mapping (for className usage) ────────────────────────
const STATUS_BG_CLASS: Record<RiskCategory, string> = {
  healthy: "bg-status-healthy",
  moderate: "bg-status-moderate",
  watchlist: "bg-status-watchlist",
  critical: "bg-status-critical",
};

const STATUS_BADGE_CLASS: Record<RiskCategory, string> = {
  healthy: "bg-status-healthy text-white",
  moderate: "bg-status-moderate text-gray-900",
  watchlist: "bg-status-watchlist text-white",
  critical: "bg-status-critical text-white",
};

// ── Raw hex values (for inline styles / canvas / Mapbox layers) ─────────
const STATUS_HEX: Record<RiskCategory, string> = {
  healthy: "#22c55e",
  moderate: "#facc15",
  watchlist: "#f97316",
  critical: "#ef4444",
};

/**
 * Get the Tailwind bg class for a risk category.
 * Usage: `className={getStatusColor("healthy")}` → `"bg-status-healthy"`
 */
export function getStatusColor(category: string): string {
  return STATUS_BG_CLASS[category as RiskCategory] ?? "bg-white/20";
}

/**
 * Get the Tailwind badge classes (bg + text) for a risk category pill.
 */
export function getStatusBadgeClass(category: string): string {
  return STATUS_BADGE_CLASS[category as RiskCategory] ?? "bg-white/20 text-white";
}

/**
 * Get the raw hex color for a risk category.
 * Used for inline styles, SVG fills, or Mapbox expressions.
 */
export function getStatusHex(category: string): string {
  return STATUS_HEX[category as RiskCategory] ?? "#94a3b8";
}
