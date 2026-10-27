from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    """Payload sent by client to analyze content compliance"""
    text: str = Field(..., min_length=1, description="Content text to scan for brand compliance")
    document_type: Optional[str] = Field(default="marketing_copy", description="Document type context (e.g. marketing_copy, press_release, technical_docs)")
    strict_mode: bool = Field(default=True, description="Enforce strict legal disclosures and trademark rules")


class RuleFinding(BaseModel):
    """Individual compliance violation or recommendation"""
    id: str = Field(..., description="Unique finding ID")
    rule_name: str = Field(..., description="Name or identifier of the violated rule")
    category: str = Field(..., description="Category: Terminology, Trademark, Legal Disclosure, Tone & Voice, Claims")
    severity: Literal["HIGH", "MEDIUM", "LOW"] = Field(..., description="Impact level of the violation")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    original_text: str = Field(..., description="Sub-string snippet that triggered the rule")
    start_index: int = Field(..., ge=0, description="0-indexed start character offset in original text")
    end_index: int = Field(..., ge=0, description="0-indexed end character offset in original text")
    violation_description: str = Field(..., description="Plain-language explanation of why this violates brand rules")
    verbatim_source: str = Field(..., description="Exact rule quote from official brand guidelines")
    source_document: str = Field(..., description="Document name, chapter, or section citation")
    suggested_fix: str = Field(..., description="Recommended compliant replacement text")
    engine: Literal["deterministic", "hybrid_rag", "llm"] = Field(..., description="Engine that flagged this violation")


class ScanResponse(BaseModel):
    """Unified scan diagnostic response"""
    status: str = Field(default="success")
    total_findings: int = Field(..., ge=0)
    high_severity_count: int = Field(..., ge=0)
    medium_severity_count: int = Field(..., ge=0)
    low_severity_count: int = Field(..., ge=0)
    compliance_score: int = Field(..., ge=0, le=100, description="Calculated 0-100 brand compliance index")
    findings: List[RuleFinding] = Field(default_factory=list)
    scanned_at: str = Field(..., description="ISO 8601 timestamp")
    execution_time_ms: float = Field(..., description="Processing latency in milliseconds")
    deterministic_time_ms: Optional[float] = Field(default=None, description="Deterministic engine latency in milliseconds")
    rag_time_ms: Optional[float] = Field(default=None, description="Hybrid RAG Qdrant search latency in milliseconds")


class IngestResponse(BaseModel):
    """Metadata returned after indexing brand guidelines document"""
    status: str = "success"
    document_id: str
    filename: str
    chunks_indexed: int
    rules_extracted: List[str]
    message: str


class ActiveRule(BaseModel):
    """An active guideline rule in the system"""
    id: str
    title: str
    category: str
    source_document: str
    rule_text: str
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    banned_terms: Optional[List[str]] = None
    suggested_replacement: Optional[str] = None


class RulesResponse(BaseModel):
    """Active brand guidelines listing"""
    total_rules: int
    rules: List[ActiveRule]


class HealthResponse(BaseModel):
    status: str
    version: str
    engine: str
    qdrant_connected: bool
