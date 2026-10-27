import time
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.scan import ScanRequest, ScanResponse, RuleFinding
from app.services.deterministic import deterministic_engine
from app.services.rag import rag_service

router = APIRouter(prefix="/scan", tags=["Compliance Scanning"])


def calculate_compliance_score(findings: List[RuleFinding], text_length: int) -> int:
    """
    Compute a normalized 0-100 Brand Compliance Index.
    Deductions are weighted by severity:
      - HIGH: 20 points
      - MEDIUM: 10 points
      - LOW: 4 points
    """
    if not findings:
        return 100

    high_count = sum(1 for f in findings if f.severity == "HIGH")
    medium_count = sum(1 for f in findings if f.severity == "MEDIUM")
    low_count = sum(1 for f in findings if f.severity == "LOW")

    total_deductions = (high_count * 20) + (medium_count * 10) + (low_count * 4)
    # Scale score nicely
    score = max(0, 100 - total_deductions)
    return score


@router.post("", response_model=ScanResponse)
async def scan_content(payload: ScanRequest):
    """
    Execute dual-engine compliance check:
    1. Deterministic Engine: Fast zero-latency regex & banned word matching.
    2. Hybrid RAG Engine: Semantic context retrieval and brand guideline comparison.
    Returns unified JSON findings with citations, severity, and suggested fixes.
    """
    start_time = time.perf_counter()
    text = payload.text.strip()

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content text cannot be empty."
        )

    # 1. Deterministic scan (measured)
    t0 = time.perf_counter()
    det_findings = deterministic_engine.scan(text, strict_mode=payload.strict_mode)
    t1 = time.perf_counter()

    # 2. Hybrid RAG scan (measured)
    rag_findings = rag_service.scan_content(text)
    t2 = time.perf_counter()

    det_time_ms = round((t1 - t0) * 1000, 2)
    rag_time_ms = round((t2 - t1) * 1000, 2)

    # 3. Deduplication & span conflict resolution
    # If a RAG finding completely overlaps an existing deterministic finding, prefer deterministic
    combined_findings: List[RuleFinding] = list(det_findings)

    for rf in rag_findings:
        is_duplicate = False
        for df in det_findings:
            # Overlapping spans check
            if not (rf.end_index <= df.start_index or rf.start_index >= df.end_index):
                is_duplicate = True
                break
            # Also check if text matches
            if rf.original_text.lower() in df.original_text.lower() or df.original_text.lower() in rf.original_text.lower():
                is_duplicate = True
                break

        if not is_duplicate:
            combined_findings.append(rf)

    # Sort all findings chronologically by their appearance in the text
    combined_findings.sort(key=lambda f: f.start_index)

    # Compute metrics
    high_count = sum(1 for f in combined_findings if f.severity == "HIGH")
    medium_count = sum(1 for f in combined_findings if f.severity == "MEDIUM")
    low_count = sum(1 for f in combined_findings if f.severity == "LOW")
    score = calculate_compliance_score(combined_findings, len(text))
    execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return ScanResponse(
        status="success",
        total_findings=len(combined_findings),
        high_severity_count=high_count,
        medium_severity_count=medium_count,
        low_severity_count=low_count,
        compliance_score=score,
        findings=combined_findings,
        scanned_at=datetime.now(timezone.utc).isoformat(),
        execution_time_ms=execution_time_ms,
        deterministic_time_ms=det_time_ms,
        rag_time_ms=rag_time_ms
    )
