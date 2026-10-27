/**
 * BrandSentinel API Client
 * Typed communication with FastAPI backend
 */

export interface RuleFinding {
  id: string;
  rule_name: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  original_text: string;
  start_index: number;
  end_index: number;
  violation_description: string;
  verbatim_source: string;
  source_document: string;
  suggested_fix: string;
  engine: "deterministic" | "hybrid_rag" | "llm";
}

export interface ScanResponse {
  status: string;
  total_findings: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  compliance_score: number;
  findings: RuleFinding[];
  scanned_at: string;
  execution_time_ms: number;
  deterministic_time_ms?: number;
  rag_time_ms?: number;
}

export interface ActiveRule {
  id: string;
  title: string;
  category: string;
  source_document: string;
  rule_text: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  banned_terms?: string[];
  suggested_replacement?: string;
}

export interface RulesResponse {
  total_rules: number;
  rules: ActiveRule[];
}

export interface IngestResponse {
  status: string;
  document_id: string;
  filename: string;
  chunks_indexed: number;
  rules_extracted: string[];
  message: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  engine: string;
  qdrant_connected: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Execute compliance scan over draft content.
 */
export async function scanContent(
  text: string,
  documentType: string = "marketing_copy",
  strictMode: boolean = true
): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      document_type: documentType,
      strict_mode: strictMode,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Scan request failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Upload brand guideline document (PDF, DOCX, TXT, MD) to the backend ingest route.
 */
export async function uploadBrandGuideline(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `File ingestion failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Backward-compatible alias for uploadBrandGuideline.
 */
export const ingestFile = uploadBrandGuideline;

/**
 * Retrieve all active brand compliance guidelines and deterministic rules.
 */
export async function getActiveRules(): Promise<RulesResponse> {
  const res = await fetch(`${API_BASE}/api/rules`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load active guidelines with status ${res.status}`);
  }

  return res.json();
}

/**
 * Check backend health and vector store connectivity.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }

  return res.json();
}
