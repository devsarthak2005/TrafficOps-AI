"use client";

import React, { useEffect } from "react";
import { useLearningStore } from "@/store/useLearningStore";
import { 
  TrendingUp, 
  Cpu, 
  RotateCw, 
  MapPin, 
  AlertCircle, 
  Sparkles, 
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";

export function LearningDashboard() {
  const { 
    analytics, 
    retrainResult, 
    isRetraining, 
    loading, 
    fetchAnalytics, 
    triggerRetraining 
  } = useLearningStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRetrain = async () => {
    try {
      await triggerRetraining();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#0a0d14]/45 p-12 text-center animate-pulse flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Compiling learning dataset...</span>
      </div>
    );
  }

  const accuracy = analytics?.prediction_accuracy ?? 0.0;
  const resourceEff = analytics?.average_resource_efficiency ?? 0.0;
  const diversionEff = analytics?.average_diversion_effectiveness ?? 0.0;
  const drift = analytics?.model_drift_indicator ?? 0.0;
  const zoneInsights = analytics?.zone_insights ?? [];
  const aiInsights = analytics?.ai_insights ?? [];

  return (
    <div className="rounded-xl border border-white/10 bg-[#070b12] text-slate-200 overflow-hidden shadow-2xl p-5 flex flex-col gap-5">
      
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
            Continuous Learning & Feedback System <TrendingUp className="h-4 w-4 text-emerald-400" />
          </h3>
          <p className="text-[10px] text-slate-500 font-mono">XGBoost post-event validation feedback loop</p>
        </div>

        {/* Manual Retrain Button */}
        <button
          onClick={handleRetrain}
          disabled={isRetraining}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.2)]`}
        >
          <RotateCw className={`h-3 w-3 ${isRetraining ? "animate-spin" : ""}`} />
          <span>{isRetraining ? "Retraining Model..." : "Trigger Model Retraining"}</span>
        </button>
      </div>

      {/* Main KPI Stats */}
      <div className="grid grid-cols-4 gap-4">
        {/* Accuracy KPI */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-white/[0.01] text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Prediction Accuracy</span>
          <h4 className="text-2xl font-black text-emerald-400 mt-1.5">{accuracy}%</h4>
          <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">Baseline forecasting match rate</p>
        </div>

        {/* Model Drift indicator */}
        <div className={`p-3.5 rounded-lg border text-center flex flex-col justify-between ${
          drift > 5.0 ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.01]"
        }`}>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Model Drift</span>
          <h4 className={`text-2xl font-black mt-1.5 ${drift > 5.0 ? "text-red-400" : "text-slate-300"}`}>
            {drift > 0 ? `+${drift}%` : `${drift}%`}
          </h4>
          <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">Accuracy variance over last half</p>
        </div>

        {/* Resource Efficiency */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-white/[0.01] text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Resource Efficiency</span>
          <h4 className="text-2xl font-black text-blue-400 mt-1.5">{resourceEff}%</h4>
          <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">Officers deployed vs planned baseline</p>
        </div>

        {/* Diversion success */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-white/[0.01] text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Diversion Effectiveness</span>
          <h4 className="text-2xl font-black text-purple-400 mt-1.5">{diversionEff}%</h4>
          <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">Average travel time savings ratio</p>
        </div>
      </div>

      {/* Retraining Results Overlay */}
      {retrainResult && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 animate-fadeIn">
          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5 mb-1">
            <Cpu className="h-3.5 w-3.5" /> Retraining Session Complete
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Model retrained on new feedback events successfully. Baseline accuracy shifted from{" "}
            <span className="font-bold text-slate-200">{retrainResult.old_accuracy}%</span> to{" "}
            <span className="font-bold text-emerald-400">{retrainResult.new_accuracy}%</span>.
          </p>
          <span className="text-[9px] font-mono text-slate-500 block mt-1.5">
            Timestamp: {new Date(retrainResult.timestamp).toLocaleString()}
          </span>
        </div>
      )}

      {/* Bottom block: Zone Learny insights & AI Insights */}
      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
        
        {/* Zone Learning Insights */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-blue-500" /> Zone Learning Insights
          </h4>

          <div className="flex flex-col gap-2 bg-slate-950/40 border border-white/5 rounded-lg p-3">
            {zoneInsights.map((zi) => (
              <div key={zi.zone} className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0 font-sans">
                <span className="text-slate-300 font-medium">{zi.zone} Zone</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-[10px]">res. time: {zi.average_resolution_time.toFixed(1)}h</span>
                  <span className="text-emerald-400 font-bold font-mono">{zi.accuracy.toFixed(1)}% Acc.</span>
                </div>
              </div>
            ))}
            {zoneInsights.length === 0 && (
              <div className="text-center py-4 text-[10px] text-slate-500 font-mono">No zone metrics compiled yet</div>
            )}
          </div>
        </div>

        {/* AI Learning Insights */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" /> AI Insights Generation
          </h4>

          <div className="flex flex-col gap-2.5 bg-[#0a0814] border border-purple-950/40 rounded-lg p-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex gap-2 text-xs text-slate-300 leading-relaxed font-sans font-medium">
                <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-[1.5px]" />
                <span>{insight}</span>
              </div>
            ))}
            {aiInsights.length === 0 && (
              <div className="text-center py-4 text-[10px] text-slate-500 font-mono">No AI insights generated</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
export default LearningDashboard;
