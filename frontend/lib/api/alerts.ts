import { apiFetch } from "@/lib/api";
import type { Alert, DismissResponse } from "@/types/alert";

/**
 * Fetch all active, non-dismissed alerts.
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>("/alerts/active");
}

/**
 * Dismiss an alert, suppressing it for 15 minutes.
 */
export async function dismissAlert(alertId: string): Promise<DismissResponse> {
  return apiFetch<DismissResponse>(`/alerts/${alertId}/dismiss`, {
    method: "POST",
  });
}
