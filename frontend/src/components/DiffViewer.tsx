"use client";

import React from "react";
import { RuleFinding } from "@/lib/api";
import { Check, X, BookOpen, Layers } from "lucide-react";

interface DiffViewerProps {
  finding: RuleFinding | null;
  onApplyFix: (finding: RuleFinding) => void;
  onApplyAllHigh: () => void;
  onDismiss: () => void;
  highSeverityCount: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  finding,
  onApplyFix,
  onApplyAllHigh,
  onDismiss,
  highSeverityCount,
}) => {
  if (!finding) return null;

  const severityBadge =
    finding.severity === "HIGH"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : finding.severity === "MEDIUM"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onDismiss}
    >
      <div 
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${severityBadge}`}>
              {finding.severity === "HIGH" ? "Error" : finding.severity === "MEDIUM" ? "Warning" : "Notice"}
            </span>
            <span className="text-xs font-medium text-zinc-200">
              {finding.rule_name}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diff Comparison Body */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-zinc-400 leading-relaxed">
            {finding.violation_description}
          </div>

          {/* Unified Diff Box */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs flex flex-col gap-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              Diff Comparison
            </div>
            <div className="space-y-1">
              <div className="text-rose-400 flex items-start gap-2 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                <span className="text-rose-500 select-none">-</span>
                <span className="line-through">{finding.original_text}</span>
              </div>
              <div className="text-emerald-400 flex items-start gap-2 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                <span className="text-emerald-500 select-none">+</span>
                <span className="text-zinc-200 font-medium">{finding.suggested_fix}</span>
              </div>
            </div>
          </div>

          {/* Source Citation Excerpt */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1 font-mono">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <BookOpen className="w-3 h-3 text-zinc-500" />
                Guideline Authority
              </span>
              <span>{finding.source_document}</span>
            </div>
            <p className="text-xs italic text-zinc-300 font-serif leading-relaxed pl-2 border-l border-zinc-700">
              "{finding.verbatim_source}"
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between px-5 h-14 border-t border-zinc-800 bg-zinc-900/60">
          <div>
            {highSeverityCount > 1 && (
              <button
                type="button"
                onClick={onApplyAllHigh}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Fix all {highSeverityCount} errors</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApplyFix(finding)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200 rounded-md transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Fix</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
