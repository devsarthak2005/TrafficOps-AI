"use client";

import { 
  UserMinus, 
  TrendingUp, 
  CalendarClock, 
  HeartPulse, 
  GitBranch,
  AlertCircle 
} from "lucide-react";
import type { Alert } from "@/types/alert";

interface AlertTypeIconProps {
  type: Alert["alert_type"];
  className?: string;
}

export default function AlertTypeIcon({ type, className = "h-4 w-4" }: AlertTypeIconProps) {
  switch (type) {
    case "officer_deficit":
      return <UserMinus className={className} />;
    case "escalation":
      return <TrendingUp className={className} />;
    case "event_readiness":
      return <CalendarClock className={className} />;
    case "hospital_corridor":
      return <HeartPulse className={className} />;
    case "incident_spread":
      return <GitBranch className={className} />;
    default:
      return <AlertCircle className={className} />;
  }
}
