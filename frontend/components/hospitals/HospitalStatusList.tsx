"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getHospitalsStatus, getHospitalStatus } from "@/lib/api/hospitals";
import type { HospitalStatus, HospitalDetail } from "@/types/hospital";
import { getStatusBadgeClass } from "@/lib/statusColors";
import { useSimulationStore } from "@/store/useSimulationStore";

function HospitalDetailItem({ hospitalId }: { hospitalId: string }) {
  const isSimulating = useSimulationStore((state) => state.isSimulating);
  const [detail, setDetail] = useState<HospitalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getHospitalStatus(hospitalId, isSimulating).then((data) => {
      if (active) {
        setDetail(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [hospitalId, isSimulating]);

  if (loading) return <div className="p-2 text-xs text-slate-400">Loading access junctions...</div>;
  if (!detail) return null;

  return (
    <div className="flex flex-col gap-2 p-3 bg-black/20 border-t border-white/10 text-xs">
      <div className="text-slate-400 mb-1 font-medium">Contributing Access Junctions</div>
      {detail.access_junctions.map((j) => (
        <div key={j.junction_id} className="flex justify-between items-center border-l-2 border-white/20 pl-2">
          <div className="flex flex-col">
            <span className="text-white font-medium">{j.junction_name}</span>
            <span className="text-slate-400 text-[10px]">Health: {j.effective_health_score}</span>
          </div>
          <div className="text-right">
            <span className="text-red-400 font-medium">-{j.contribution_to_penalty} pt</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HospitalStatusList() {
  const isSimulating = useSimulationStore((state) => state.isSimulating);
  const [hospitals, setHospitals] = useState<HospitalStatus[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getHospitalsStatus(isSimulating).then((data) => {
      // Sort worst-first: lowest accessibility score first
      data.sort((a, b) => a.accessibility_score - b.accessibility_score);
      setHospitals(data);
    });
  }, [isSimulating]);

  return (
    <div className="flex flex-col gap-2 mt-3">
      {hospitals.map((h) => {
        const isExpanded = expandedId === h.hospital_id;
        return (
          <div key={h.hospital_id} className="flex flex-col rounded-lg border border-white/10 bg-white/5 overflow-hidden transition-all">
            <button 
              onClick={() => setExpandedId(isExpanded ? null : h.hospital_id)}
              className="flex items-center justify-between p-3 hover:bg-white/10 transition-colors text-left"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-white">{h.hospital_name}</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm w-fit ${getStatusBadgeClass(h.accessibility_band)}`}>
                  {h.accessibility_band.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-white leading-none">{h.accessibility_score}</span>
                  <span className="text-[9px] font-semibold tracking-widest text-slate-400 mt-1">SCORE</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {isExpanded && <HospitalDetailItem hospitalId={h.hospital_id} />}
          </div>
        );
      })}
    </div>
  );
}
