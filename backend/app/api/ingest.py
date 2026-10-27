import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.rag import rag_service
from app.schemas.scan import IngestResponse

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post("", response_model=IngestResponse)
async def ingest_guidelines(file: UploadFile = File(...)):
    """
    Ingest brand guidelines from PDF or DOCX documents.
    Extracts atomic rule chunks and indexes them into the Qdrant hybrid vector store.
    """
    filename = file.filename or "unknown_guideline"
    ext = filename.lower().split(".")[-1]

    if ext not in ["pdf", "docx", "txt", "md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{ext}. BrandSentinel accepts .pdf, .docx, .txt, and .md files."
        )

    try:
        content = await file.read()
        chunks = []

        if ext == "pdf":
            chunks = rag_service.parse_pdf(content, filename)
        elif ext == "docx":
            chunks = rag_service.parse_docx(content, filename)
        elif ext in ["txt", "md"]:
            text_str = content.decode("utf-8", errors="ignore")
            paragraphs = [p.strip() for p in text_str.split("\n\n") if len(p.strip()) > 20]
            for idx, p in enumerate(paragraphs, start=1):
                chunks.append({
                    "doc_id": f"{filename}_chunk_{idx}",
                    "title": f"Rule {idx} ({filename})",
                    "category": rag_service._infer_category(p),
                    "source_document": f"{filename} - Section {idx}",
                    "rule_text": p,
                    "severity": rag_service._infer_severity(p),
                    "suggested_fix": "Rewrite according to brand style guidelines.",
                    "trigger_phrases": []
                })

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No readable text or rule blocks could be extracted from the uploaded document."
            )

        indexed_count = 0
        rules_extracted: List[str] = []

        for chunk in chunks:
            success = rag_service.index_rule(
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                category=chunk["category"],
                source_document=chunk["source_document"],
                rule_text=chunk["rule_text"],
                severity=chunk["severity"],
                suggested_fix=chunk["suggested_fix"],
                trigger_phrases=chunk.get("trigger_phrases", [])
            )
            if success:
                indexed_count += 1
                rules_extracted.append(chunk["title"])

        # Rebuild BM25 index with new chunks
        rag_service._refresh_bm25_index()

        return IngestResponse(
            status="success",
            document_id=f"doc-{uuid.uuid4().hex[:8]}",
            filename=filename,
            chunks_indexed=indexed_count,
            rules_extracted=rules_extracted[:10],  # Return preview of first 10 rules
            message=f"Successfully extracted and indexed {indexed_count} brand guideline rules from {filename}."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest guideline document: {str(e)}"
        )
