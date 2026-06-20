"use client";

import { useEffect } from "react";
import { useMLStore } from "@/store/useMLStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { useDiversionStore } from "@/store/useDiversionStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import { TrafficCommanderCard } from "./TrafficCommanderCard";
import { LearningDashboard } from "./LearningDashboard";
import { BrainCircuit, Cpu, Compass, Database, Activity, History } from "lucide-react";

export function AIInsightsView() {
  const { 
    prediction, 
    importances, 
    predictionHistory, 
    fetchImportances,
    briefing,
    isGeneratingBriefing,
    generateBriefing
  } = useMLStore();

  const operationsPlan = useOperationsStore((state) => state.plan);
  const operationsInputs = useOperationsStore((state) => state.inputs);
  const diversionPlan = useDiversionStore((state) => state.plan);
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);

  // Trigger briefing automatically when prediction is generated but briefing is empty
  useEffect(() => {
    fetchImportances();
  }, [fetchImportances]);

  const handleRegenerateBriefing = () => {
    if (!prediction) return;

    const activeSim = activeSimulations[0];
    const eventCause = prediction.cause ? prediction.cause.toLowerCase().replace(" ", "_") : "others";
    const eventType = activeSim ? activeSim.event_type : "planned";
    const zone = operationsInputs.zone || "Central";
    const junction = activeSim ? activeSim.target_id : "silk-board";

    const payload = {
      prediction: {
        impact_level: prediction.predicted_impact,
        confidence: prediction.confidence
      },
      feature_contributions: prediction.reasons.map((r) => {
        const match = r.match(/^(.*?) contributed \+(\d+)%$/);
        return {
          feature: match ? match[1].trim() : r,
          contribution: match ? parseFloat(match[2]) : 10.0
        };
      }),
      resource_plan: {
        deployment_score: operationsPlan?.deployment_score || 50.0,
        officers_required: operationsPlan?.officers_required || 0,
        patrol_vehicles: operationsPlan?.patrol_vehicles || 0,
        barricades: operationsPlan?.barricades || 0,
        diversion_level: operationsPlan?.diversion_level || "None",
        emergency_corridor_required: operationsPlan?.emergency_corridor_required || false,
        estimated_response_time: operationsPlan?.estimated_response_time || "N/A",
        estimated_operational_cost: operationsPlan?.estimated_operational_cost || 0.0
      },
      diversion_plan: diversionPlan ? {
        routes: diversionPlan.routes || [],
        estimated_vehicles_diverted: diversionPlan.estimated_vehicles_diverted || 0,
        estimated_delay_reduction: diversionPlan.estimated_delay_reduction || "0%"
      } : undefined,
      event_metadata: {
        event_type: eventType,
        event_cause: eventCause,
        zone: zone,
        junction: junction,
        attendance: operationsInputs.event_attendance || 1000,
        duration: operationsInputs.event_duration || 2.0,
        start_time: activeSim ? new Date(activeSim.started_at).toLocaleTimeString() : new Date().toLocaleTimeString()
      }
    };

    generateBriefing(payload);
  };

  useEffect(() => {
    if (prediction && !briefing && !isGeneratingBriefing) {
      handleRegenerateBriefing();
    }
  }, [prediction, briefing, isGeneratingBriefing]);


  // Helper to render active forecast Shapley breakdown
  const renderActiveExplainability = () => {
    if (!prediction) {
      return (
        <div className="rounded-xl border border-dashed border-white/10 bg-panel/50 p-6 text-center flex flex-col items-center justify-center min-h-[200px] flex-1">
          <Activity className="h-8 w-8 text-slate-600 mb-2" />
          <h4 className="font-semibold text-slate-300 text-xs mb-1 uppercase tracking-wider">Active Explainability Standby</h4>
          <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
            Run an event scenario in the Event Simulator to view real-time logit explanations and local Shapley breakdowns here.
          </p>
        </div>
      );
    }

    const { predicted_impact, confidence, reasons, explanation } = prediction;
    
    // Color coding thresholds
    const colorConfig = {
      Low: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", ring: "stroke-emerald-500" },
      Medium: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", ring: "stroke-amber-500" },
      High: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", ring: "stroke-orange-500" },
      Critical: { text: "text-red-400 bg-red-500/10 border-red-500/20", bg: "bg-red-500/10", border: "border-red-500/20 animate-pulse", ring: "stroke-red-500" },
    }[predicted_impact];

    return (
      <div className="rounded-xl border border-white/5 bg-panel p-5 flex flex-col gap-4 shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Active Forecast Explainability</span>
            <h3 className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1.5">
              Impact: <span className={colorConfig.text}>{predicted_impact}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium">Confidence:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400">
              {Math.round(confidence)}%
            </span>
          </div>
        </div>

        {/* Local Contributions (Shapley Reasons Diverging Bar Chart) */}
        <div className="flex flex-col gap-3 py-1">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Explainability Factors (Logit Contributions)</h4>
            <div className="flex gap-4 text-[9px] text-slate-500 font-mono">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Reduces Risk</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Increases Risk</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {reasons.map((r, i) => {
              const match = r.match(/^(.*?)\s+contributed\s+([+-]?)(\d+)%$/i);
              if (!match) {
                return (
                  <div key={i} className="text-slate-400 text-[11px] font-mono pl-2 border-l border-white/10">
                    * {r}
                  </div>
                );
              }
              const label = match[1].trim();
              const sign = match[2] === "-" ? "-" : "+";
              const pct = parseInt(match[3], 10);
              const isPositive = sign === "+";
              const barWidth = Math.min(50, pct / 2);

              return (
                <div key={i} className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="text-[11px] truncate max-w-[75%]">{label}</span>
                    <span className={`font-semibold font-mono ${isPositive ? "text-blue-400" : "text-emerald-400"}`}>
                      {sign}{pct}%
                    </span>
                  </div>
                  <div className="relative h-4 w-full bg-white/5 rounded overflow-hidden flex items-center">
                    {/* Centered zero-axis line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 border-l border-dashed border-white/20 z-10" />
                    
                    {/* The bar */}
                    <div 
                      className={`absolute h-full rounded-sm transition-all duration-300 ${
                        isPositive 
                          ? "bg-gradient-to-r from-blue-600/50 to-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.25)]" 
                          : "bg-gradient-to-r from-emerald-600/50 to-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      }`}
                      style={{
                        width: `${barWidth}%`,
                        left: isPositive ? "50%" : `calc(50% - ${barWidth}%)`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminal Explanation Panel */}
        <div className="rounded-md border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-slate-300 leading-relaxed max-h-[140px] overflow-y-auto">
          <span className="text-slate-500 font-bold block mb-1"># model_explanation_stream</span>
          <pre className="whitespace-pre-wrap">{explanation}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          AI Model Insights & Feature Importance <BrainCircuit className="h-5 w-5 text-blue-400" />
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          Validation diagnostics, XGBoost booster parameter structures, and global explainability metrics.
        </p>
      </div>

      {/* AI Traffic Commander (Executive Copilot) Section */}
      <div className="w-full">
        <TrafficCommanderCard 
          briefing={briefing}
          isGenerating={isGeneratingBriefing}
          onRegenerate={handleRegenerateBriefing}
        />
      </div>

      {/* Post-Event Continuous Learning System */}
      <div className="w-full">
        <LearningDashboard />
      </div>


      <div className="grid grid-cols-12 gap-6 min-h-0 flex-1 animate-fadeIn">
        {/* Left Column: Diagnostics and Importances (6 cols) */}
        <div className="col-span-6 flex flex-col gap-6">
          
          {/* Model Metrics Card */}
          <div className="rounded-xl border border-white/5 bg-panel p-5 flex flex-col gap-4 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" /> XGBoost Classifier Performance
            </h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Highlight Recall */}
              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-center relative overflow-hidden">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Critical Recall</span>
                <h4 className="text-3xl font-black text-blue-400 mt-1">93%</h4>
                <p className="text-[8px] text-slate-500 mt-1 leading-normal">Accurate forecast of escalation cases</p>
              </div>

              {/* Multiclass Accuracy */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Accuracy</span>
                <h4 className="text-3xl font-black text-slate-200 mt-1">56%</h4>
                <p className="text-[8px] text-slate-500 mt-1 leading-normal">Overall multiclass diagnostic match</p>
              </div>

              {/* F1 Score */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">F1 Weighted</span>
                <h4 className="text-3xl font-black text-slate-200 mt-1">68%</h4>
                <p className="text-[8px] text-slate-500 mt-1 leading-normal">Robust balance of precision & recall</p>
              </div>
            </div>

            <div className="flex gap-6 text-[10px] text-slate-400 font-mono mt-1 justify-around bg-black/30 p-2.5 rounded border border-white/5">
              <span className="flex items-center gap-1.5"><Database className="h-3 w-3 text-blue-400" /> Train Rows: 3,129</span>
              <span className="flex items-center gap-1.5"><Compass className="h-3 w-3 text-blue-400" /> Estimators: 100</span>
              <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-blue-400" /> Max Depth: 6</span>
            </div>
          </div>

          {/* Global Feature Importance Chart */}
          <div className="rounded-xl border border-white/5 bg-panel p-5 flex flex-col gap-4 shadow-lg flex-1 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" /> Global Feature Importance (Top Features)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Dynamic API pull</span>
            </div>

            {importances.length === 0 ? (
              <div className="text-center p-6 text-slate-500 text-xs">Loading importance matrix...</div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {importances.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-medium text-slate-300">{item.feature}</span>
                      <span className="font-semibold text-blue-400">{item.importance}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${item.importance}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active forecast & Prediction History Logs (6 cols) */}
        <div className="col-span-6 flex flex-col gap-6">
          {/* Active forecast Explainability */}
          {renderActiveExplainability()}

          {/* Prediction History Logs */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-lg overflow-y-auto flex-1 min-h-[220px]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-400" /> Prediction Run History (Current Session)
            </h3>

            {predictionHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs h-full">
                No predictions generated in this browser session.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {predictionHistory.map((pred, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-400">{pred.cause || "EVENT"}</span>
                      <span className="text-[10px] text-slate-500">{pred.timestamp}</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Predicted Impact:</span>
                      <span className={`font-bold ${
                        {
                          Low: "text-emerald-400",
                          Medium: "text-amber-400",
                          High: "text-orange-400",
                          Critical: "text-red-400 animate-pulse"
                        }[pred.predicted_impact]
                      }`}>{pred.predicted_impact}</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Confidence Score:</span>
                      <span className="font-semibold text-slate-200">{Math.round(pred.confidence)}%</span>
                    </div>

                    <div className="border-t border-white/5 pt-1.5 flex flex-wrap gap-1.5">
                      {pred.reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-slate-400">
                          {r.split(" contributed")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AIInsightsView;
