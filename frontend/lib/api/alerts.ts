import { apiFetch } from "@/lib/api";
import type { Alert, DismissResponse, AlertPayload } from "@/types/alert";

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

export async function getPredictiveAlerts(severity?: string, status?: string): Promise<AlertPayload[]> {
  const params = [];
  if (severity) params.push(`severity=${severity}`);
  if (status) params.push(`status=${status}`);
  const query = params.length > 0 ? "?" + params.join("&") : "";
  return apiFetch<AlertPayload[]>(`/api/alerts${query}`);
}

export async function acknowledgeAlert(alertId: string): Promise<{ alert_id: string; status: string }> {
  return apiFetch<{ alert_id: string; status: string }>("/api/alerts/acknowledge", {
    method: "POST",
    body: JSON.stringify({ alert_id: alertId })
  });
}

export async function resolveAlert(alertId: string): Promise<{ alert_id: string; status: string }> {
  return apiFetch<{ alert_id: string; status: string }>("/api/alerts/resolve", {
    method: "POST",
    body: JSON.stringify({ alert_id: alertId })
  });
}

