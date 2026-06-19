export interface Alert {
  alert_id: string;
  alert_type: "escalation" | "hospital_corridor" | "officer_deficit" | "event_readiness" | "incident_spread";
  junction_id?: string;
  junction_name?: string;
  confidence: number;
  message: string;
  generated_at: string;
}

export interface DismissResponse {
  alert_id: string;
  status: string;
  suppressed_until: string;
}

export interface AlertPayload {
  alert_id: string;
  severity: "Watch" | "Warning" | "Critical";
  title: string;
  description: string;
  confidence: number;
  created_at: string;
  status: "active" | "acknowledged" | "resolved";
}

