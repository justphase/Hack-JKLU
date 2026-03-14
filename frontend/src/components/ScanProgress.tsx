"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Loader, Clock } from "lucide-react";

interface EngineRowProps {
  engine: string;
  label: string;
  color: "purple" | "blue" | "amber" | "red" | "emerald";
  isRunning: boolean;
  isComplete: boolean;
  progress: number;
}

function EngineRow({ engine, label, color, isRunning, isComplete, progress }: EngineRowProps) {
  const colorMap = {
    purple: { bar: "bg-purple-500", text: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    blue:   { bar: "bg-blue-500",   text: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20"     },
    amber:  { bar: "bg-amber-500",  text: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20"   },
    red:    { bar: "bg-red-500",    text: "text-red-400",    bg: "bg-red-500/10 border-red-500/20"       },
    emerald: { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  };
  const c = colorMap[color];

  return (
    <div className={`border rounded-xl p-5 transition-all duration-500 ${
      isComplete ? "border-gray-700 bg-gray-900/40" :
      isRunning  ? `border ${c.bg}` :
      "border-gray-800 bg-gray-900/20 opacity-50"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-xs font-bold px-2.5 py-1 rounded-md border ${c.bg} ${c.text}`}>
            {engine}
          </div>
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle size={16} />
              <span className="text-xs font-semibold">Done</span>
            </div>
          ) : isRunning ? (
            <div className={`flex items-center gap-1.5 ${c.text}`}>
              <Loader size={14} className="animate-spin" />
              <span className="text-xs font-semibold">Running</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={14} />
              <span className="text-xs">Queued</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isComplete ? "bg-green-500" : c.bar
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isRunning  && <p className="text-xs text-gray-500 mt-2">Analyzing files...</p>}
      {isComplete && <p className="text-xs text-gray-500 mt-2">Complete — findings ready</p>}
    </div>
  );
}

const engines = [
  { engine: "SAST", label: "Static Code Analysis", color: "purple" as const },
  { engine: "SCA",  label: "Dependency Scanner", color: "blue" as const },
  { engine: "API",  label: "API Security", color: "amber" as const },
  { engine: "SEC",  label: "Secrets Scanner", color: "red" as const },
];

const tips = [
  "In 2025, supply chain attacks affected packages with over 2.6 billion weekly npm downloads.",
  "Over 80% of modern web apps rely on at least one dependency with a known vulnerability.",
  "Hardcoded secrets in git history remain exploitable even after deletion from the latest commit.",
  "OWASP API Security Top 10 guarantees broken object authorization is still number one.",
  "AI Agents process over millions of token structures per day.",
];

export default function ScanProgress() {
  const [engineStates, setEngineStates] = useState(
    engines.map(() => ({ progress: 0, isRunning: false, isComplete: false }))
  );
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => setCurrentTip(prev => (prev + 1) % tips.length), 4000);
    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    engines.forEach((eng, index) => {
      // Stagger start times visually
      const startDelay = index * 1000;
      setTimeout(() => {
        setEngineStates(prev => {
          const next = [...prev];
          next[index] = { ...next[index], isRunning: true, progress: 0 };
          return next;
        });

        // Loop progress up to 98% (waiting for real API to resolve and change state)
        let prog = 0;
        const interval = setInterval(() => {
          prog += Math.random() * 8 + 2;
          if (prog >= 98) {
             prog = 98; // Hold at 98% until the API completes
             clearInterval(interval);
          }
          setEngineStates(prev => {
            const next = [...prev];
            next[index] = { ...next[index], progress: prog };
            return next;
          });
        }, 500);
      }, startDelay);
    });
  }, []);

  const completedCount = engineStates.filter(e => e.isComplete).length;
  // Visual overall progress (fake)
  const totalProgress = engineStates.reduce((acc, curr) => acc + curr.progress, 0) / engines.length;

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      {/* Overall progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">Overall progress</span>
          <span className="text-sm font-bold text-white">
            {Math.round(totalProgress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Engine rows */}
      <div className="space-y-3 mb-8">
        {engines.map((eng, index) => (
          <EngineRow
            key={eng.engine}
            {...eng}
            isRunning={engineStates[index].isRunning}
            isComplete={engineStates[index].isComplete}
            progress={engineStates[index].progress}
          />
        ))}
      </div>

      {/* Tip */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          While you wait
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">{tips[currentTip]}</p>
      </div>
    </div>
  );
}
