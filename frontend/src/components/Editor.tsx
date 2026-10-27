"use client";

import React, { useState, useRef } from "react";
import { RuleFinding } from "@/lib/api";
import { 
  ChevronDown, 
  RotateCcw, 
  Loader2, 
  SlidersHorizontal, 
  Check,
  Sparkles,
  Zap,
  Activity
} from "lucide-react";

export const HACKATHON_DEMO_TEXT = `Welcome to Brand Sentinel! Our new AI powered governance cloud integrates directly with the legacy Twitter API and Facebook Inc services.

Our engineers guarantee that our platform is the fastest in the world and 100% secure with zero vulnerability guarantee. 

We have deprecated the old whitelist and blacklist configurations, transitioning to an advanced master/slave cluster architecture. Competitor X is terrible and completely broken compared to our revolutionary solution. Click the green button on the right to start your trial.`;

const COMPLIANT_SAMPLE_TEXT = `Welcome to BrandSentinel®! Our new AI-powered governance cloud integrates directly with the X API and Meta Platforms ecosystem.

Our engineering specialists validate that our platform delivers industry-leading throughput validated by enterprise benchmark studies and SOC 2 Type II certification.

We have upgraded the legacy allowlist and blocklist configurations, transitioning to a resilient primary/replica distributed architecture. In contrast to conventional legacy governance tools, our solution delivers continuous compliance assurance. Select Get Started to begin your trial.`;

interface EditorProps {
  content: string;
  onChange: (text: string) => void;
  findings: RuleFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onApplyFix: (finding: RuleFinding) => void;
  onApplyAllFixes: () => void;
  onScan: (overrideText?: string) => void;
  onRunScan: () => void;
  isScanning: boolean;
  strictMode: boolean;
  onToggleStrictMode: () => void;
  executionTimeMs?: number;
  deterministicTimeMs?: number;
  ragTimeMs?: number;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  onChange,
  findings,
  selectedFindingId,
  onSelectFinding,
  onApplyFix,
  onApplyAllFixes,
  onScan,
  onRunScan,
  isScanning,
  strictMode,
  onToggleStrictMode,
  executionTimeMs,
  deterministicTimeMs,
  ragTimeMs,
}) => {
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onScan();
    }
  };

  const loadDemoSample = () => {
    onChange(HACKATHON_DEMO_TEXT);
    setPresetDropdownOpen(false);
    onScan(HACKATHON_DEMO_TEXT);
  };

  const loadCompliantSample = () => {
    onChange(COMPLIANT_SAMPLE_TEXT);
    setPresetDropdownOpen(false);
    onScan(COMPLIANT_SAMPLE_TEXT);
  };

  const formatLatency = (timeMs: number | undefined) =>
    timeMs === undefined ? "—" : `${timeMs}ms`;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden backdrop-blur-sm relative transition-colors shadow-sm">
      {/* Indeterminate Scanning Progress Line (Micro-Interaction) */}
      {isScanning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-200 dark:bg-zinc-800 overflow-hidden z-20">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-500 dark:via-emerald-400 to-transparent animate-shimmer" />
        </div>
      )}

      {/* 1. Editor Document Controls Toolbar (shrink-0) */}
      <div className="min-h-11 shrink-0 flex items-center justify-between gap-3 px-4 py-1.5 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/40 text-xs">
        <div className="flex items-center gap-2">
          {/* Document Type Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors border border-slate-200 dark:border-zinc-800 bg-white dark:bg-transparent shadow-xs"
            >
              <span className="text-slate-500 dark:text-zinc-400 font-normal">Document:</span>
              <span className="font-medium text-slate-900 dark:text-zinc-200">Marketing Draft</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
            </button>

            {presetDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setPresetDropdownOpen(false)} 
                />
                <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-30">
                  <div className="px-3 py-1 text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Presets
                  </div>
                  <button
                    onClick={loadDemoSample}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/80 flex flex-col gap-0.5 transition-colors"
                  >
                    <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">Non-Compliant Sample</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-500 leading-tight">Brand casing, banned terms, puffery</span>
                  </button>
                  <button
                    onClick={loadCompliantSample}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/80 flex flex-col gap-0.5 transition-colors"
                  >
                    <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">100% Compliant Release</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-500 leading-tight">Fully aligned with brand guidelines</span>
                  </button>
                  <div className="border-t border-slate-200 dark:border-zinc-800/60 my-1" />
                  <button
                    onClick={() => {
                      onChange("");
                      setPresetDropdownOpen(false);
                      onScan("");
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    Blank Document
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick-Demo State Button (Instant population & scan execution) */}
          <button
            type="button"
            onClick={loadDemoSample}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-xs active:scale-95"
            title="Load and scan a sample draft with common brand violations"
          >
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/20" />
            <span>Load Demo Sample</span>
          </button>

          {/* Strict Mode Toggle */}
          <button
            type="button"
            onClick={onToggleStrictMode}
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors border ${
              strictMode
                ? "bg-slate-200 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-200 border-slate-300 dark:border-zinc-700"
                : "text-slate-500 dark:text-zinc-500 border-transparent hover:text-slate-700 dark:hover:text-zinc-300"
            }`}
            title="Enforce trademark symbols and legal disclosure footnotes"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
            <span>Strict</span>
            {strictMode && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
          </button>
        </div>

        {/* Right side: Prominent Run Scan Button with Micro-Interaction */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunScan}
            disabled={isScanning || !content.trim()}
            className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all shadow-xs overflow-hidden ${
              isScanning
                ? "bg-slate-300 dark:bg-zinc-200 text-slate-900 dark:text-zinc-950 animate-pulse cursor-wait"
                : "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning content...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-indigo-300 dark:text-zinc-700" />
                <span>Run Scan</span>
                <kbd className="hidden sm:inline text-[9px] font-mono bg-slate-800 dark:bg-zinc-200/80 text-slate-300 dark:text-zinc-600 px-1 py-0.2 rounded ml-0.5">
                  ⌘↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Text Editor Canvas */}
      <div className="relative flex-1 min-h-0 p-5 flex flex-col overflow-hidden bg-white dark:bg-transparent">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ready for compliance scan. Type or paste content here to check it against your guidelines."
          className="w-full flex-1 min-h-0 bg-transparent text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 font-sans text-sm md:text-[14px] leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-slate-200 dark:selection:bg-zinc-800 overflow-y-auto"
          spellCheck="false"
        />
      </div>

      {findings.length > 0 && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/40 min-w-0">
          <span className="shrink-0 rounded-md border border-amber-400/50 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200">
            {findings.length} {findings.length === 1 ? "Issue" : "Issues"} Found
          </span>

          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="flex w-max items-center gap-1.5">
              {findings.map((finding) => (
                <button
                  key={finding.id}
                  type="button"
                  onClick={() => onApplyFix(finding)}
                  title={`Apply suggested replacement: "${finding.original_text}" → "${finding.suggested_fix}"`}
                  className="inline-flex max-w-64 items-center gap-1.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 px-2 py-1 text-[10px] font-mono text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors active:scale-[0.98]"
                >
                  <span className="max-w-24 truncate text-slate-500 dark:text-zinc-400 line-through">
                    {finding.original_text}
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500">→</span>
                  <span className="max-w-28 truncate font-medium">{finding.suggested_fix}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onApplyAllFixes}
            title={`Apply all ${findings.length} suggested fixes`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors active:scale-[0.98]"
          >
            <Zap className="w-3 h-3 text-amber-400 dark:text-amber-500" />
            Apply All Fixes
          </button>
        </div>
      )}

      {/* Live Telemetry Status Footer */}
      <div className="flex items-center justify-between px-4 h-8 shrink-0 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-100/70 dark:bg-slate-950/70 text-[10px] font-mono text-slate-500 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} chars</span>
        </div>

        {/* Live Telemetry Speed Breakdown Badge */}
        <div
          className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300"
          title="Measured by the backend during the most recent scan"
          aria-label="Execution telemetry for the most recent scan"
        >
          <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Deterministic Engine: <strong className="font-semibold text-slate-900 dark:text-zinc-100">{formatLatency(deterministicTimeMs)}</strong></span>
          <span className="opacity-50">·</span>
          <span>Qdrant Hybrid RAG: <strong className="font-semibold text-slate-900 dark:text-zinc-100">{formatLatency(ragTimeMs)}</strong></span>
          <span className="opacity-50">·</span>
          <span className="text-slate-500 dark:text-zinc-400">Total: {formatLatency(executionTimeMs)}</span>
        </div>
      </div>
    </div>
  );
};
