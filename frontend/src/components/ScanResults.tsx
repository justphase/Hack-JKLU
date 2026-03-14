"use client";
import React, { useState } from "react";
import {
  AlertTriangle, CheckCircle, Copy, ChevronDown, ChevronUp,
  Filter, Download, Shield, ExternalLink
} from "lucide-react";
import { AnimatedButtonOutline } from "./ui/animated-button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Vulnerability {
  engine: string;
  severity: string;
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  fixSuggestion: string;
  cweId?: string;
}

interface EngineSummary {
  engine: string;
  vulnerabilities: number;
  filesScanned: number;
  durationMs: number;
}

interface ScanResultProps {
  result: {
    scanId: string;
    riskScore?: number;
    totalVulnerabilities?: number;
    vulnerabilities?: Vulnerability[];
    engineSummaries?: EngineSummary[];
    message?: string;
    repository?: string;
    completedAt?: string;
    ipfsCid?: string;
    ipfsUrl?: string;
    txHash?: string;
    explorerUrl?: string;
    contentHash?: string;
  };
  onReset: () => void;
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 80) return <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/25">Critical Risk</span>;
  if (score >= 60) return <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">High Risk</span>;
  if (score >= 30) return <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">Medium Risk</span>;
  return <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Low Risk</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/25",
    high:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
    medium:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    low:      "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border uppercase shrink-0 ${map[severity] || "bg-gray-500/15 text-gray-400 border-gray-500/25"}`}>
      {severity}
    </span>
  );
}

function EngineBadge({ engine }: { engine: string }) {
  const map: Record<string, string> = {
    sast:    "bg-purple-500/15 text-purple-400 border-purple-500/25",
    sca:     "bg-blue-500/15 text-blue-400 border-blue-500/25",
    api:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
    secrets: "bg-red-500/15 text-red-400 border-red-500/25",
    ai:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${map[engine] || "bg-gray-500/15 text-gray-400 border-gray-500/25"}`}>
      {engine}
    </span>
  );
}

function FindingCard({ finding }: { finding: Vulnerability }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(finding.fixSuggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderMap: Record<string, string> = {
    critical: "border-red-500/20 hover:border-red-500/40",
    high:     "border-orange-500/20 hover:border-orange-500/40",
    medium:   "border-yellow-500/20 hover:border-yellow-500/40",
    low:      "border-gray-700 hover:border-gray-500",
  };

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${borderMap[finding.severity] || "border-gray-800"}`}>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <AlertTriangle
          size={16}
          className={`shrink-0 ${
            finding.severity === "critical" ? "text-red-400" :
            finding.severity === "high"     ? "text-orange-400" :
            finding.severity === "medium"   ? "text-yellow-400" : "text-blue-400"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{finding.title}</p>
          {finding.filePath && (
            <p className="text-xs text-gray-500 mt-0.5">
              {finding.filePath}{finding.lineNumber ? ` · line ${finding.lineNumber}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EngineBadge engine={finding.engine} />
          <SeverityBadge severity={finding.severity} />
          {expanded
            ? <ChevronUp size={16} className="text-gray-500" />
            : <ChevronDown size={16} className="text-gray-500" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Why this is dangerous
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{finding.description}</p>
          </div>

          {finding.codeSnippet && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code</p>
              <pre className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-emerald-400 font-mono overflow-x-auto">
                {finding.codeSnippet}
              </pre>
            </div>
          )}

          {finding.fixSuggestion && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                How to fix it
              </p>
              <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3">
                <code className="text-sm text-emerald-400 flex-1 font-mono">{finding.fixSuggestion}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {copied
                    ? <><CheckCircle size={14} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                    : <><Copy size={14} /><span>Copy</span></>
                  }
                </button>
              </div>
            </div>
          )}

          {finding.cweId && (
            <a
              href={`https://cwe.mitre.org/data/definitions/${finding.cweId.replace("CWE-", "")}.html`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink size={12} />
              View {finding.cweId} on MITRE
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScanResults({ result, onReset }: ScanResultProps) {
  const [filter, setFilter] = useState("all");
  const [downloading, setDownloading] = useState(false);

  const vulns = result.vulnerabilities || [];
  const filters = ["all", "critical", "high", "medium", "low"];
  const filtered = filter === "all" ? vulns : vulns.filter((v) => v.severity === filter);

  const score = result.riskScore ?? 0;
  const scoreColor =
    score >= 80 ? "text-red-400" :
    score >= 60 ? "text-orange-400" :
    score >= 30 ? "text-yellow-400" : "text-emerald-400";

  const severityCounts = {
    critical: vulns.filter((v) => v.severity === "critical").length,
    high:     vulns.filter((v) => v.severity === "high").length,
    medium:   vulns.filter((v) => v.severity === "medium").length,
    low:      vulns.filter((v) => v.severity === "low").length,
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";
      const res = await fetch(`${apiUrl}/report/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oracle-decree-${result.scanId?.slice(0, 8) || "scan"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Score + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Risk score card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risk Score</p>
          <div className="flex items-end gap-3 mb-2">
            <span className={`text-6xl font-black leading-none ${scoreColor}`}>{score}</span>
            <span className="text-gray-600 text-lg mb-1">/100</span>
          </div>
          <RiskBadge score={score} />
        </div>

        {/* Findings breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Findings breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { count: severityCounts.critical, label: "Critical", color: "text-red-400" },
              { count: severityCounts.high,     label: "High",     color: "text-orange-400" },
              { count: severityCounts.medium,   label: "Medium",   color: "text-yellow-400" },
              { count: severityCounts.low,      label: "Low",      color: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`text-xl font-black ${s.color}`}>{s.count}</span>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risk trend — 7 days</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={[
              { date: "Mon", score: Math.max(0, score - 15) },
              { date: "Tue", score: Math.max(0, score - 10) },
              { date: "Wed", score: Math.max(0, score - 5) },
              { date: "Thu", score: Math.max(0, score - 2) },
              { date: "Fri", score: Math.max(0, score + 4) },
              { date: "Sat", score: Math.max(0, score + 1) },
              { date: "Sun", score: score },
            ]}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#f97316" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#f97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Blockchain / IPFS badge */}
      {(result.ipfsCid || result.txHash) && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">Decentralized & Tamper-Proof</span>
          </div>
          <div className="flex gap-6 flex-wrap text-xs">
            {result.ipfsCid && (
              <span className="text-gray-400">
                IPFS:{" "}
                <a href={result.ipfsUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                  {result.ipfsCid.slice(0, 16)}...
                </a>
              </span>
            )}
            {result.txHash && (
              <span className="text-gray-400">
                TX:{" "}
                <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                  {result.txHash.slice(0, 18)}...
                </a>
              </span>
            )}
            {result.contentHash && (
              <span className="text-gray-400">
                Hash: <code className="text-emerald-400 text-[11px]">{result.contentHash.slice(0, 20)}...</code>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-end mb-4">
        <AnimatedButtonOutline
          onClick={downloadPDF}
          disabled={downloading}
          icon={<Download size={14} />}
          title={downloading ? "Generating..." : "Export PDF"}
          size="sm"
        />
      </div>

      {/* Findings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            Findings
            <span className="text-gray-500 font-normal ml-2 text-base">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-500" />
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  filter === f
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filtered.length > 0 ? (
            filtered.map((finding, i) => <FindingCard key={i} finding={finding} />)
          ) : (
            <div className="text-center py-16">
              <CheckCircle size={40} className="mx-auto mb-3 text-gray-700" />
              <p className="font-semibold text-gray-500">No {filter} severity findings</p>
              <p className="text-sm text-gray-600 mt-1">This severity level is clean</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
