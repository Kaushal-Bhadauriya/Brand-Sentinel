"use client";

import React, { useState, useMemo } from "react";
import { RuleFinding, ActiveRule, uploadBrandGuideline } from "@/lib/api";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
  BookOpen,
  Loader2,
  FileText,
  Search,
  RefreshCw
} from "lucide-react";

interface CitationPanelProps {
  findings: RuleFinding[];
  complianceScore: number;
  selectedFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onPreviewDiff: (finding: RuleFinding) => void;
  onApplyFixDirect: (finding: RuleFinding) => void;
  activeRules: ActiveRule[];
  onRefreshRules: () => void;
  rulesLoading: boolean;
  rulesError: string | null;
  onOpenUploadModal?: () => void;
}

export const CitationPanel: React.FC<CitationPanelProps> = ({
  findings,
  complianceScore,
  selectedFindingId,
  onSelectFinding,
  onPreviewDiff,
  onApplyFixDirect,
  activeRules,
  onRefreshRules,
  rulesLoading,
  rulesError,
  onOpenUploadModal,
}) => {
  const [activeTab, setActiveTab] = useState<"findings" | "rules">("findings");
  const [filter, setFilter] = useState<"ALL" | "ERRORS" | "WARNINGS">("ALL");
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [ruleSearch, setRuleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const toggleQuote = (id: string) => {
    setExpandedQuotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRuleExpand = (id: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply the fix immediately so the editor and diagnostics update in the same click.
  const handleAnimatedFix = (finding: RuleFinding) => {
    setDismissingIds((prev) => new Set(prev).add(finding.id));
    onApplyFixDirect(finding);
  };

  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const warningCount = findings.filter((f) => f.severity === "MEDIUM" || f.severity === "LOW").length;

  const filteredFindings = findings.filter((f) => {
    if (filter === "ERRORS") return f.severity === "HIGH";
    if (filter === "WARNINGS") return f.severity === "MEDIUM" || f.severity === "LOW";
    return true;
  });

  // Filter rules catalog based on search & category
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeRules.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [activeRules]);

  const filteredRules = useMemo(() => {
    return activeRules.filter((r) => {
      const matchesSearch =
        ruleSearch === "" ||
        r.title.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        r.rule_text.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        r.source_document.toLowerCase().includes(ruleSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeRules, ruleSearch, selectedCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const res = await uploadBrandGuideline(file);
      setUploadMessage(`Indexed ${res.chunks_indexed} rules from ${res.filename}`);
      onRefreshRules();
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setUploadMessage(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Compact circular progress calculation
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, complianceScore));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  const ringColor =
    complianceScore >= 95
      ? "#10b981" // emerald
      : complianceScore >= 70
      ? "#f59e0b" // amber
      : "#f43f5e"; // rose

  const isClean = complianceScore === 100 || findings.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden backdrop-blur-sm transition-colors shadow-sm">
      {/* 1. Fixed Header: Dynamic Health Meter & Navigation (shrink-0) */}
      <div className="px-3.5 h-11 shrink-0 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/40 flex items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("findings")}
            className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "findings"
                ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            Diagnostics
            {findings.length > 0 && (
              <span className="ml-1 px-1.5 py-0.1 rounded-full text-[10px] font-mono bg-slate-300/80 dark:bg-zinc-700/60 text-slate-800 dark:text-zinc-300">
                {findings.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "rules"
                ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            Rules Index ({activeRules.length})
          </button>
        </div>

        {/* Dynamic Health Score with Animated Ring and Emerald Success State */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[11px] font-medium leading-none flex items-center justify-end gap-1">
              <span className={`transition-all duration-300 font-mono font-bold ${
                isClean ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-zinc-200"
              }`}>
                {complianceScore}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">
                {isClean ? "compliant" : "health"}
              </span>
            </div>
            <div className="text-[9px] text-slate-500 dark:text-zinc-500 font-mono mt-0.5">
              {isClean ? (
                <span className="text-emerald-600 dark:text-emerald-400/90 font-medium">All rules checked</span>
              ) : (
                <span>{highCount} error{highCount !== 1 ? "s" : ""} · {warningCount} warn</span>
              )}
            </div>
          </div>

          <div
            className="relative h-8 w-8 shrink-0"
            role="img"
            aria-label={`Compliance health ${normalizedScore}%`}
          >
            <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90">
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-slate-200 dark:stroke-zinc-800"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                stroke={ringColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Tab 1: Linter Diagnostics */}
      {activeTab === "findings" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* 2. Fixed Filter Bar (shrink-0) */}
          <div className="flex items-center justify-between px-3.5 h-7 shrink-0 border-b border-slate-200 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/20 text-[10px]">
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  filter === "ALL"
                    ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-200 font-semibold"
                    : "text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300"
                }`}
              >
                All ({findings.length})
              </button>
              <button
                onClick={() => setFilter("ERRORS")}
                className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  filter === "ERRORS"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold"
                    : "text-slate-500 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400"
                }`}
              >
                Errors ({highCount})
              </button>
              <button
                onClick={() => setFilter("WARNINGS")}
                className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  filter === "WARNINGS"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                    : "text-slate-500 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                Warnings ({warningCount})
              </button>
            </div>

            <span className="text-slate-500 dark:text-zinc-500 font-mono text-[10px]">
              {filteredFindings.length} issue{filteredFindings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* 3. ONLY THIS LIST IS INTERNALLY SCROLLABLE (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 pr-1.5">
            {findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 dark:text-zinc-500 animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 shadow-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">All brand compliance checks passed</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5 max-w-xs">
                  This draft matches the active rules.
                </div>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 dark:text-zinc-500">
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">No findings in this filter</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">Change the filter to review other findings.</div>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFindingId === finding.id;
                const isQuoteOpen = expandedQuotes.has(finding.id);
                const isDismissing = dismissingIds.has(finding.id);

                const severityBadge =
                  finding.severity === "HIGH"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/20"
                    : finding.severity === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700";

                return (
                  <div
                    key={finding.id}
                    onClick={() => onSelectFinding(isSelected ? null : finding.id)}
                    className={`group rounded-lg border bg-slate-50/50 dark:bg-zinc-900/40 p-2.5 transition-all duration-200 cursor-pointer ${
                      isDismissing
                        ? "opacity-0 -translate-x-4 scale-95 pointer-events-none"
                        : isSelected
                        ? "border-slate-400 dark:border-zinc-500 bg-white dark:bg-zinc-900/80 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    {/* Header: Severity, Rule Name & Document Citation */}
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-medium border ${severityBadge}`}>
                          {finding.severity === "HIGH" ? "Error" : finding.severity === "MEDIUM" ? "Warn" : "Info"}
                        </span>
                        <span className="text-xs font-medium text-slate-900 dark:text-zinc-200 truncate">
                          {finding.rule_name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate shrink-0">
                        {finding.source_document.split(" - ")[0].replace(/_/g, " ").slice(0, 20)}
                      </span>
                    </div>

                    {/* Brief Policy Explanation */}
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight mb-2">
                      {finding.violation_description}
                    </p>

                    {/* Compact Inline Diff with Instant Action Button */}
                    <div className="rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-1.5 font-mono text-[11px] flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="line-through text-rose-600 dark:text-rose-400/90 truncate">{finding.original_text}</span>
                        <span className="text-slate-400 dark:text-zinc-600">→</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{finding.suggested_fix}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewDiff(finding);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Diff
                        </button>
                        <button
                          type="button"
                          disabled={isDismissing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnimatedFix(finding);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-xs disabled:opacity-60 disabled:cursor-wait"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>{isDismissing ? "Applying..." : "Accept Fix"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Verbatim Source Link */}
                    {finding.verbatim_source && (
                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleQuote(finding.id);
                          }}
                          className="text-[10px] text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-500" />
                          <span>Verbatim Guideline Excerpt</span>
                          {isQuoteOpen ? (
                            <ChevronUp className="w-2.5 h-2.5" />
                          ) : (
                            <ChevronDown className="w-2.5 h-2.5" />
                          )}
                        </button>
                        {isQuoteOpen && (
                          <div className="mt-1 p-1.5 rounded bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 text-[10px] text-slate-700 dark:text-zinc-400 italic font-serif leading-relaxed">
                            "{finding.verbatim_source}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Fully Functional Interactive Rules Catalog */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 space-y-2">
          {/* Prominent guideline ingestion action */}
          <div className="shrink-0 rounded-lg bg-slate-900 dark:bg-zinc-800 px-3 py-3 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <FileText className="w-4 h-4 text-slate-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Add your brand guidelines</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-slate-300">
                    Upload a handbook to index it in the Qdrant vector store.
                  </div>
                </div>
              </div>

              {onOpenUploadModal ? (
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload guidelines</span>
                </button>
              ) : (
                <label className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-slate-100">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Upload guidelines</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Rules Search & Category Filters (shrink-0) */}
          <div className="space-y-1.5 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="Filter indexed rules by keyword..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
              />
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-[10px] font-mono">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? "bg-slate-900 dark:bg-zinc-200 text-white dark:text-zinc-900 font-semibold"
                      : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {uploadMessage && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded shrink-0">
              {uploadMessage}
            </div>
          )}

          {/* Full Interactive Rules List (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span>Vector Store Catalog ({filteredRules.length} of {activeRules.length})</span>
              <div className="flex items-center gap-2">
                <span>Qdrant Dense+BM25</span>
                <button
                  type="button"
                  onClick={onRefreshRules}
                  disabled={rulesLoading}
                  title="Refresh indexed rules"
                  aria-label="Refresh indexed rules"
                  className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${rulesLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {rulesLoading && activeRules.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading indexed rules...</span>
              </div>
            ) : rulesError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-xs text-rose-700 dark:text-rose-300">{rulesError}</p>
                <button
                  type="button"
                  onClick={onRefreshRules}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredRules.length === 0 && activeRules.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-zinc-400">
                No rules are indexed yet. Upload a guideline to populate the catalog.
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
                No indexed rules match the current filters.
              </div>
            ) : (
              filteredRules.map((rule) => {
                const isExpanded = expandedRuleIds.has(rule.id);
                const sevBadge =
                  rule.severity === "HIGH"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/20"
                    : rule.severity === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700";

                return (
                  <div
                    key={rule.id}
                    onClick={() => toggleRuleExpand(rule.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRuleExpand(rule.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900/60 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-medium border ${sevBadge}`}>
                          {rule.severity}
                        </span>
                        <span className="font-medium text-xs text-slate-900 dark:text-zinc-200 truncate">
                          {rule.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                        {rule.category}
                      </span>
                    </div>

                    <p className={`text-[11px] text-slate-600 dark:text-zinc-400 leading-tight ${isExpanded ? "" : "line-clamp-2"}`}>
                      {rule.rule_text}
                    </p>

                    {/* Expandable Banned Terms & Source Excerpt */}
                    {isExpanded && (
                      <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-zinc-800 space-y-1.5 text-[10px]">
                        {rule.banned_terms && rule.banned_terms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-slate-400 dark:text-zinc-500 font-mono">Triggers:</span>
                            {rule.banned_terms.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-mono"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {rule.suggested_replacement && (
                          <div className="text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1">
                            <span className="text-slate-400 dark:text-zinc-500">Replacement:</span>
                            <span className="font-semibold">{rule.suggested_replacement}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span className="truncate" title={rule.source_document}>Source: {rule.source_document}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {isExpanded ? "Collapse ▲" : "Inspect ▼"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
