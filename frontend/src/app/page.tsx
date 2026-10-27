"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@/components/Editor";
import { CitationPanel } from "@/components/CitationPanel";
import { DiffViewer } from "@/components/DiffViewer";
import { UploadModal } from "@/components/UploadModal";
import { useWorkspaceHeaderActions } from "@/components/WorkspaceHeaderActions";
import { 
  scanContent, 
  getActiveRules, 
  RuleFinding, 
  ActiveRule, 
  ScanResponse,
  IngestResponse
} from "@/lib/api";
import { 
  FileText, 
  Check
} from "lucide-react";

const INITIAL_DEMO_TEXT = `Welcome to Brand Sentinel! Our new AI powered cloud compliance engine is the fastest in the world and guarantees 100% security against all malicious attacks.

We have deprecated the old blacklist and whitelist configuration, moving towards an advanced master/slave cluster architecture. 

Our rockstar team ensures that our free forever tier provides completely unhackable data protection. Competitor X is terrible and completely broken compared to our revolutionary solution. Click the green button on the right to start your trial.`;

function replaceFindingText(text: string, finding: RuleFinding): string | null {
  const { original_text: original, suggested_fix: replacement, start_index, end_index } = finding;
  if (!original) return null;

  if (
    start_index >= 0 &&
    end_index >= start_index &&
    start_index <= text.length &&
    end_index <= text.length &&
    text.slice(start_index, end_index) === original
  ) {
    return text.slice(0, start_index) + replacement + text.slice(end_index);
  }

  let matchIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const candidate = text.indexOf(original, searchFrom);
    if (candidate === -1) break;
    const distance = Math.abs(candidate - start_index);
    if (distance < nearestDistance) {
      matchIndex = candidate;
      nearestDistance = distance;
    }
    searchFrom = candidate + original.length;
  }

  if (matchIndex === -1) return null;
  return text.slice(0, matchIndex) + replacement + text.slice(matchIndex + original.length);
}

function calculateOptimisticScore(findings: RuleFinding[]): number {
  const high = findings.filter((finding) => finding.severity === "HIGH").length;
  const medium = findings.filter((finding) => finding.severity === "MEDIUM").length;
  const low = findings.filter((finding) => finding.severity === "LOW").length;
  return findings.length === 0 ? 100 : Math.max(0, 100 - high * 20 - medium * 10 - low * 4);
}

export default function WorkspacePage() {
  const [content, setContent] = useState<string>(INITIAL_DEMO_TEXT);
  const [findings, setFindings] = useState<RuleFinding[]>([]);
  const contentRef = useRef(content);
  const findingsRef = useRef(findings);
  const scanRequestRef = useRef(0);
  const [complianceScore, setComplianceScore] = useState<number>(100);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [diffFinding, setDiffFinding] = useState<RuleFinding | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [deterministicTimeMs, setDeterministicTimeMs] = useState<number | undefined>(undefined);
  const [ragTimeMs, setRagTimeMs] = useState<number | undefined>(undefined);
  const [activeRules, setActiveRules] = useState<ActiveRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState<boolean>(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [lastUploadedDoc, setLastUploadedDoc] = useState<IngestResponse | null>(null);
  const { registerActions } = useWorkspaceHeaderActions();

  const showSuccessToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSuccessToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setSuccessToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Load Active Rules Catalog
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const data = await getActiveRules();
      setActiveRules(data.rules);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load the rules catalog.";
      setRulesError(message);
      console.error("Could not load rules catalog:", err);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Execute Compliance Scan (Supports optional overrideText for instant demo loading)
  const handleScan = useCallback(async (overrideText?: string, successMessage?: string) => {
    const requestId = ++scanRequestRef.current;
    const textToScan = typeof overrideText === "string" ? overrideText : content;
    if (!textToScan.trim()) {
      findingsRef.current = [];
      setFindings([]);
      setComplianceScore(100);
      setSelectedFindingId(null);
      setErrorNotice(null);
      setIsScanning(false);
      return;
    }

    try {
      setIsScanning(true);
      setErrorNotice(null);
      const res: ScanResponse = await scanContent(textToScan, "marketing_copy", strictMode);
      if (requestId !== scanRequestRef.current) return;
      findingsRef.current = res.findings;
      setFindings(res.findings);
      setComplianceScore(res.compliance_score);
      setExecutionTimeMs(res.execution_time_ms);
      setDeterministicTimeMs(res.deterministic_time_ms);
      setRagTimeMs(res.rag_time_ms);
      if (successMessage) showSuccessToast(successMessage);

      if (selectedFindingId && !res.findings.some(f => f.id === selectedFindingId)) {
        setSelectedFindingId(null);
      }
    } catch (err: unknown) {
      if (requestId !== scanRequestRef.current) return;
      console.error("Scan failed:", err);
      setErrorNotice(err instanceof Error ? err.message : "Failed to communicate with BrandSentinel server.");
    } finally {
      if (requestId === scanRequestRef.current) setIsScanning(false);
    }
  }, [content, strictMode, selectedFindingId, showSuccessToast]);

  const handleRunScan = useCallback(() => {
    void handleScan(undefined, "Compliance scan completed.");
  }, [handleScan]);

  // Initial scan on mount
  useEffect(() => {
    handleScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle successful guideline upload from modal
  const handleUploadSuccess = (res: IngestResponse) => {
    setLastUploadedDoc(res);
    fetchRules();
    const extractedCount = res.rules_extracted.length || res.chunks_indexed;
    showSuccessToast(`${res.filename} indexed in Qdrant · ${extractedCount} rules.`);
    // Immediately re-scan draft content against newly ingested guidelines
    setTimeout(() => {
      handleScan();
    }, 150);
  };

  const handleContentChange = (nextContent: string) => {
    contentRef.current = nextContent;
    setContent(nextContent);
  };

  const handleDraftUpload = useCallback(async (file: File) => {
    try {
      const draftText = await file.text();
      contentRef.current = draftText;
      setContent(draftText);
      setSelectedFindingId(null);
      setDiffFinding(null);
      setErrorNotice(null);
      await handleScan(draftText);
    } catch (err: unknown) {
      console.error("Could not read uploaded draft:", err);
      setErrorNotice(err instanceof Error ? err.message : "Could not read the uploaded draft.");
    }
  }, [handleScan]);

  const openGuidelinesUpload = useCallback(() => {
    setIsUploadModalOpen(true);
  }, []);

  useEffect(() => {
    registerActions({
      onUploadDraft: handleDraftUpload,
      onOpenGuidelinesUpload: openGuidelinesUpload,
    });
    return () => registerActions(null);
  }, [handleDraftUpload, openGuidelinesUpload, registerActions]);

  const handleAcceptFix = (finding: RuleFinding) => {
    console.log("Accepting fix:", finding);
    const currentContent = contentRef.current;
    if (!finding.original_text || !currentContent.includes(finding.original_text)) {
      setErrorNotice("Could not apply the suggested fix because the original text is no longer in the draft.");
      return;
    }

    scanRequestRef.current += 1;
    const newText = currentContent.replace(finding.original_text, finding.suggested_fix);
    contentRef.current = newText;
    setContent(newText);
    setIsScanning(false);
    setDiffFinding(null);
    setSelectedFindingId(null);

    const remaining = findingsRef.current.filter((item) => item.id !== finding.id);
    findingsRef.current = remaining;
    setFindings(remaining);
    setComplianceScore(calculateOptimisticScore(remaining));
    setErrorNotice(null);
  };

  const handleApplyAllFixes = () => {
    let updated = contentRef.current;
    const activeFindings = [...findingsRef.current].sort(
      (left, right) => right.start_index - left.start_index
    );
    const appliedIds = new Set<string>();

    for (const finding of activeFindings) {
      const nextText = replaceFindingText(updated, finding);
      if (nextText !== null) {
        updated = nextText;
        appliedIds.add(finding.id);
      }
    }

    if (appliedIds.size === 0) return;

    scanRequestRef.current += 1;
    contentRef.current = updated;
    setContent(updated);
    setIsScanning(false);
    setDiffFinding(null);
    setSelectedFindingId(null);

    const remaining = findingsRef.current.filter((finding) => !appliedIds.has(finding.id));
    findingsRef.current = remaining;
    setFindings(remaining);
    setComplianceScore(calculateOptimisticScore(remaining));
    setErrorNotice(
      remaining.length > 0
        ? "Some fixes could not be applied because their original text is no longer in the draft."
        : null
    );
    if (remaining.length === 0) {
      showSuccessToast(`Successfully applied all ${appliedIds.size} fixes.`);
    } else {
      showSuccessToast(`Applied ${appliedIds.size} fixes; ${remaining.length} need review.`);
    }
  };

  // Bulk apply all high severity fixes with optimistic score update
  const handleApplyAllHigh = () => {
    let updated = contentRef.current;
    const highFindings = findingsRef.current
      .filter((finding) => finding.severity === "HIGH")
      .sort((left, right) => right.start_index - left.start_index);
    const appliedIds = new Set<string>();

    for (const finding of highFindings) {
      const nextText = replaceFindingText(updated, finding);
      if (nextText !== null) {
        updated = nextText;
        appliedIds.add(finding.id);
      }
    }

    if (appliedIds.size === 0) {
      if (highFindings.length > 0) {
        setErrorNotice("Could not apply the suggested fixes because the original text is no longer in the draft.");
      }
      return;
    }

    contentRef.current = updated;
    setContent(updated);
    setDiffFinding(null);
    setSelectedFindingId(null);

    const remaining = findingsRef.current.filter((finding) => !appliedIds.has(finding.id));
    findingsRef.current = remaining;
    setFindings(remaining);
    setComplianceScore(calculateOptimisticScore(remaining));
    setErrorNotice(null);
    void handleScan(updated);
  };

  const highSeverityCount = findings.filter((f) => f.severity === "HIGH").length;

  return (
    <div className="h-full overflow-hidden flex flex-col min-h-0 gap-2.5">
      {/* 1. Active Guidelines Ribbon (Clean text-based, zero step badges) */}
      <div className="shrink-0 h-10 px-3.5 py-1.5 flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 text-xs shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-slate-500 dark:text-zinc-500 font-normal shrink-0">Active Guidelines:</span>

          <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-medium truncate">
            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
            <span className="truncate">
              {lastUploadedDoc 
                ? lastUploadedDoc.filename 
                : "Brand Style Guide & Legal Handbook 2026"}
            </span>
          </div>

          <span className="text-slate-300 dark:text-zinc-600 font-mono shrink-0">·</span>
          <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px] shrink-0">
            {lastUploadedDoc
              ? `${lastUploadedDoc.rules_extracted.length || lastUploadedDoc.chunks_indexed} handbook rules`
              : `${activeRules.length} rules loaded`}
          </span>

          {lastUploadedDoc && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono shrink-0 ml-1">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Indexed
            </span>
          )}
        </div>

      </div>

      {/* Subdued error toast if backend is unreachable (shrink-0) */}
      {errorNotice && (
        <div className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-zinc-900 border border-rose-200 dark:border-zinc-800 text-xs text-rose-700 dark:text-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => handleScan()}
            className="px-2 py-0.5 rounded text-[11px] font-medium text-rose-800 dark:text-zinc-300 hover:bg-rose-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Main Zero-Scroll Split-Screen Workspace (flex-1 min-h-0) */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-12 gap-3">
        {/* Left Column: 7 Cols (Editor with Top Quick Fixes Toolbar) */}
        <div className="col-span-12 lg:col-span-7 h-full min-h-0 flex flex-col overflow-hidden">
          <Editor
            content={content}
            onChange={handleContentChange}
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onApplyFix={handleAcceptFix}
            onApplyAllFixes={handleApplyAllFixes}
            onScan={handleScan}
            onRunScan={handleRunScan}
            isScanning={isScanning}
            strictMode={strictMode}
            onToggleStrictMode={() => {
              setStrictMode(!strictMode);
              setTimeout(() => handleScan(), 50);
            }}
            executionTimeMs={executionTimeMs}
            deterministicTimeMs={deterministicTimeMs}
            ragTimeMs={ragTimeMs}
          />
        </div>

        {/* Right Column: 5 Cols (Diagnostics & Linter Panel with Internal Scroll) */}
        <div className="col-span-12 lg:col-span-5 h-full min-h-0 flex flex-col overflow-hidden">
          <CitationPanel
            findings={findings}
            complianceScore={complianceScore}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onPreviewDiff={(finding) => setDiffFinding(finding)}
            onApplyFixDirect={handleAcceptFix}
            activeRules={activeRules}
            onRefreshRules={fetchRules}
            rulesLoading={rulesLoading}
            rulesError={rulesError}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
          />
        </div>
      </div>

      {/* Brand Guidelines Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Diff Inspection Modal */}
      <DiffViewer
        finding={diffFinding}
        onApplyFix={handleAcceptFix}
        onApplyAllHigh={handleApplyAllHigh}
        onDismiss={() => setDiffFinding(null)}
        highSeverityCount={highSeverityCount}
      />

      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-16 z-[60] flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-white/95 px-3 py-2 text-xs font-medium text-slate-800 shadow-lg backdrop-blur dark:bg-zinc-900/95 dark:text-zinc-100"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
          </span>
          {successToast}
        </div>
      )}
    </div>
  );
}
