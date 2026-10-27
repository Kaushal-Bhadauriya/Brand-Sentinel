import io
import os
import re
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from app.core.config import settings
from app.schemas.scan import RuleFinding, ActiveRule

logger = logging.getLogger("BrandSentinel.RAG")

# Pre-seeded brand guidelines for initial zero-config bootstrap
DEFAULT_GUIDELINE_SEEDS: List[Dict[str, Any]] = [
    {
        "id": "SEED-TONE-01",
        "title": "Professional Tone & Avoidance of Sensationalism",
        "category": "Tone & Voice",
        "severity": "MEDIUM",
        "source_document": "Brand_Style_Guide_v4.2.pdf - Section 2.1",
        "rule_text": "All public and corporate communications must maintain an authoritative, objective, and measured tone. Never use clickbait, excessive exclamation marks, emotional hyperbole (e.g. 'miracle solution', 'mind-blowing disruption'), or colloquial slang. Focus strictly on measurable architectural value and customer ROI.",
        "trigger_phrases": ["mind-blowing", "miracle", "insane", "crazy fast", "game-changing magic", "revolutionary disruption"],
        "suggested_fix": "transformative technological advancement with proven enterprise efficacy"
    },
    {
        "id": "SEED-LEGAL-01",
        "title": "Substantiation of Market Leadership & Benchmarks",
        "category": "Legal Disclosure",
        "severity": "HIGH",
        "source_document": "Legal_Compliance_Standards_v3.pdf - Section 4.1",
        "rule_text": "Claims regarding market share, performance speed, or comparative benchmark leadership must be accompanied by an approved legal disclaimer and dated citation. Unsubstantiated assertions such as 'the uncontested industry leader' or '10x faster than all alternatives' violate advertising compliance standards.",
        "trigger_phrases": ["10x faster than all alternatives", "uncontested industry leader", "unbeatable speed", "no competition"],
        "suggested_fix": "significantly accelerated throughput based on audited benchmark testing (Q3 2026 report)*"
    },
    {
        "id": "SEED-TRADEMARK-01",
        "title": "Product Brand Integrity & Co-Branding Rules",
        "category": "Trademark",
        "severity": "HIGH",
        "source_document": "Brand_Style_Guide_v4.2.pdf - Section 1.4",
        "rule_text": "Do not combine BrandSentinel with partner brand names using hyphens or slashes without explicit co-branding clearance (e.g., avoid 'BrandSentinel-AWS' or 'BrandSentinel/Google'). Always state: 'BrandSentinel for AWS' or 'BrandSentinel running on Google Cloud'.",
        "trigger_phrases": ["BrandSentinel-AWS", "BrandSentinel-Google", "BrandSentinel/Azure", "BrandSentinel-Azure"],
        "suggested_fix": "BrandSentinel for AWS / Azure / Google Cloud"
    },
    {
        "id": "SEED-SECURITY-01",
        "title": "Compliance Commitments: SOC 2 and GDPR",
        "category": "Legal Disclosure",
        "severity": "HIGH",
        "source_document": "Security_and_Privacy_Guidelines.pdf - Section 3.2",
        "rule_text": "When addressing customer data privacy and data residency, always refer to our SOC 2 Type II certification and GDPR/CCPA compliance frameworks. Never guarantee that customer data will 'never ever be subpoenaed or touched under any circumstance' as this contradicts lawful judicial compliance.",
        "trigger_phrases": ["never ever touched", "completely private from all governments", "immune to subpoenas"],
        "suggested_fix": "protected under strict SOC 2 Type II certified encryption and GDPR-compliant data processing controls"
    },
    {
        "id": "SEED-ACCESSIBILITY-01",
        "title": "Inclusive Visual and Content Accessibility",
        "category": "Accessibility",
        "severity": "LOW",
        "source_document": "Design_System_Accessibility.pdf - Section 1.5",
        "rule_text": "Avoid directional or visual-only instructions in copy, such as 'Click the green button on the right' or 'See the blue box above'. Use semantic and descriptive instructional text such as 'Select Submit to confirm your scan' to support screen readers and neurodiverse users.",
        "trigger_phrases": ["click the green button", "see the blue box above", "click here", "look at the red arrow"],
        "suggested_fix": "select the designated action or review the corresponding section"
    }
]


class HybridRAGEngine:
    """
    Production Hybrid RAG Engine combining:
    1. SentenceTransformers (Dense vector embeddings via all-MiniLM-L6-v2)
    2. BM25 (Sparse keyword ranking)
    3. Reciprocal Rank Fusion (RRF) for re-ranking
    4. Qdrant Vector Store with automatic local persistence fallback
    """

    def __init__(self):
        self._embedding_model = None
        self._qdrant_client = None
        self._bm25_model = None
        self._corpus_chunks: List[Dict[str, Any]] = []
        self._initialized = False

    def _get_embedding_model(self):
        """Lazy load SentenceTransformer model singleton"""
        if self._embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
                self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            except Exception as e:
                logger.error(f"Failed to load SentenceTransformer: {e}")
                self._embedding_model = None
        return self._embedding_model

    def _get_qdrant_client(self):
        """
        Connect to Qdrant server or fallback to persistent local storage / in-memory.
        Ensures zero-crash local development without external daemon requirements.
        """
        if self._qdrant_client is None:
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import Distance, VectorParams

            client = None
            # 1. Attempt connection to configured QDRANT_URL
            if settings.QDRANT_URL and not settings.QDRANT_URL.startswith("file:"):
                try:
                    logger.info(f"Attempting to connect to Qdrant at {settings.QDRANT_URL}")
                    candidate = QdrantClient(
                        url=settings.QDRANT_URL,
                        api_key=settings.QDRANT_API_KEY,
                        timeout=1.5
                    )
                    # Verify connectivity
                    candidate.get_collections()
                    client = candidate
                    logger.info("Successfully connected to remote Qdrant service.")
                except Exception as e:
                    logger.warning(f"Could not connect to Qdrant at {settings.QDRANT_URL} ({e}). Falling back to local storage.")

            # 2. Fallback to local disk-backed Qdrant
            if client is None:
                try:
                    storage_path = Path(settings.QDRANT_LOCAL_PATH)
                    storage_path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"Initializing local persistent Qdrant at {storage_path.resolve()}")
                    client = QdrantClient(path=str(storage_path))
                except Exception as e:
                    logger.warning(f"Failed to initialize disk Qdrant ({e}). Falling back to in-memory Qdrant.")
                    client = QdrantClient(":memory:")

            # Ensure collection exists
            try:
                collections = client.get_collections().collections
                collection_names = [c.name for c in collections]
                if settings.QDRANT_COLLECTION not in collection_names:
                    logger.info(f"Creating collection '{settings.QDRANT_COLLECTION}'")
                    client.create_collection(
                        collection_name=settings.QDRANT_COLLECTION,
                        vectors_config=VectorParams(
                            size=settings.EMBEDDING_DIMENSION,
                            distance=Distance.COSINE
                        )
                    )
            except Exception as e:
                logger.error(f"Error checking/creating Qdrant collection: {e}")

            self._qdrant_client = client
        return self._qdrant_client

    def initialize_bootstrap_rules(self):
        """Seed default brand guidelines into Qdrant & BM25 if empty"""
        if self._initialized:
            return

        try:
            client = self._get_qdrant_client()
            existing_count = 0
            try:
                collection_info = client.get_collection(settings.QDRANT_COLLECTION)
                existing_count = collection_info.points_count or 0
            except Exception:
                existing_count = 0

            if existing_count == 0:
                logger.info("Bootstrapping initial brand guidelines into vector store...")
                for item in DEFAULT_GUIDELINE_SEEDS:
                    self.index_rule(
                        doc_id=item["id"],
                        title=item["title"],
                        category=item["category"],
                        source_document=item["source_document"],
                        rule_text=item["rule_text"],
                        severity=item["severity"],
                        suggested_fix=item.get("suggested_fix"),
                        trigger_phrases=item.get("trigger_phrases", [])
                    )

            self._refresh_bm25_index()
            self._initialized = True
        except Exception as e:
            logger.error(f"Error bootstrapping guidelines: {e}")

    def _tokenize(self, text: str) -> List[str]:
        """Simple whitespace/punctuation tokenizer for BM25 ranking"""
        return re.findall(r"\w+", text.lower())

    def _refresh_bm25_index(self):
        """Reconstruct in-memory BM25 index across all indexed guidelines"""
        try:
            from rank_bm25 import BM25Okapi
            client = self._get_qdrant_client()
            # Scroll points from Qdrant
            records, _ = client.scroll(
                collection_name=settings.QDRANT_COLLECTION,
                limit=1000,
                with_payload=True,
                with_vectors=False
            )
            self._corpus_chunks = []
            tokenized_corpus = []

            for record in records:
                payload = record.payload or {}
                self._corpus_chunks.append({
                    "id": str(record.id),
                    **payload
                })
                text_to_index = f"{payload.get('title', '')} {payload.get('rule_text', '')} {' '.join(payload.get('trigger_phrases', []))}"
                tokenized_corpus.append(self._tokenize(text_to_index))

            if tokenized_corpus:
                self._bm25_model = BM25Okapi(tokenized_corpus)
            else:
                self._bm25_model = None
        except Exception as e:
            logger.error(f"Error refreshing BM25 index: {e}")

    def index_rule(
        self,
        doc_id: str,
        title: str,
        category: str,
        source_document: str,
        rule_text: str,
        severity: str,
        suggested_fix: Optional[str] = None,
        trigger_phrases: Optional[List[str]] = None
    ) -> bool:
        """
        Embed and persist an individual brand rule chunk in Qdrant vector store.
        """
        try:
            from qdrant_client.http.models import PointStruct

            client = self._get_qdrant_client()
            model = self._get_embedding_model()

            composite_text = f"{title}. {rule_text}"
            if trigger_phrases:
                composite_text += f" Examples: {', '.join(trigger_phrases)}"

            vector = None
            if model:
                vector = model.encode(composite_text).tolist()
            else:
                # Fallback zero-vector if torch/embeddings not available
                vector = [0.0] * settings.EMBEDDING_DIMENSION

            payload = {
                "rule_id": doc_id,
                "title": title,
                "category": category,
                "source_document": source_document,
                "rule_text": rule_text,
                "severity": severity,
                "suggested_fix": suggested_fix or "Align with corporate brand guideline principles.",
                "trigger_phrases": trigger_phrases or []
            }

            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, doc_id))
            client.upsert(
                collection_name=settings.QDRANT_COLLECTION,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            return True
        except Exception as e:
            logger.error(f"Failed to index rule '{title}': {e}")
            return False

    def parse_pdf(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """Extract text chunks from uploaded PDF using pdfplumber"""
        import pdfplumber
        chunks = []
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page_idx, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text()
                    if not text or not text.strip():
                        continue

                    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
                    for p_idx, para in enumerate(paragraphs, start=1):
                        chunks.append({
                            "doc_id": f"{filename}_p{page_idx}_c{p_idx}",
                            "title": f"Guideline from {filename} (Page {page_idx})",
                            "category": self._infer_category(para),
                            "source_document": f"{filename} - Page {page_idx}",
                            "rule_text": para,
                            "severity": self._infer_severity(para),
                            "suggested_fix": "Rewrite to conform with brand compliance standards.",
                            "trigger_phrases": []
                        })
        except Exception as e:
            logger.error(f"Error parsing PDF file {filename}: {e}")
        return chunks

    def parse_docx(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """Extract text chunks from uploaded DOCX using python-docx"""
        import docx
        chunks = []
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            current_section = "General Brand Guidelines"

            for p_idx, para in enumerate(doc.paragraphs, start=1):
                text = para.text.strip()
                if not text:
                    continue

                if para.style.name.startswith("Heading"):
                    current_section = text
                    continue

                if len(text) > 30:
                    chunks.append({
                        "doc_id": f"{filename}_p{p_idx}",
                        "title": f"{current_section} ({filename})",
                        "category": self._infer_category(text),
                        "source_document": f"{filename} - {current_section}",
                        "rule_text": text,
                        "severity": self._infer_severity(text),
                        "suggested_fix": "Align phrasing with enterprise brand standards.",
                        "trigger_phrases": []
                    })
        except Exception as e:
            logger.error(f"Error parsing DOCX file {filename}: {e}")
        return chunks

    def _infer_category(self, text: str) -> str:
        """Infer standard brand category from rule content"""
        lower = text.lower()
        if any(w in lower for w in ["trademark", "logo", "brand name", "casing", "symbol"]):
            return "Trademark"
        if any(w in lower for w in ["legal", "compliance", "ftc", "disclaimer", "guarantee", "warranty"]):
            return "Legal Disclosure"
        if any(w in lower for w in ["tone", "voice", "humor", "sensational", "colloquial", "style"]):
            return "Tone & Voice"
        if any(w in lower for w in ["accessibility", "screen reader", "color contrast", "wcag"]):
            return "Accessibility"
        return "Terminology"

    def _infer_severity(self, text: str) -> str:
        """Infer severity from regulatory & compliance strength markers"""
        lower = text.lower()
        if any(w in lower for w in ["prohibited", "strictly forbidden", "never", "illegal", "must not", "mandatory"]):
            return "HIGH"
        if any(w in lower for w in ["avoid", "discouraged", "should not", "prefer"]):
            return "MEDIUM"
        return "LOW"

    def hybrid_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Execute Hybrid Search combining Dense Vector Search and BM25 Sparse Search
        with Reciprocal Rank Fusion (RRF).
        """
        if not query or not query.strip():
            return []

        client = self._get_qdrant_client()
        model = self._get_embedding_model()

        # 1. Dense retrieval via Qdrant
        dense_results: List[Tuple[str, float]] = []
        if model:
            try:
                query_vector = model.encode(query).tolist()
                search_hits = client.search(
                    collection_name=settings.QDRANT_COLLECTION,
                    query_vector=query_vector,
                    limit=top_k * 2
                )
                for rank, hit in enumerate(search_hits):
                    dense_results.append((str(hit.payload.get("rule_id", hit.id)), 1.0 / (rank + 1)))
            except Exception as e:
                logger.error(f"Dense vector retrieval error: {e}")

        # 2. BM25 sparse keyword retrieval
        bm25_results: List[Tuple[str, float]] = []
        if self._bm25_model and self._corpus_chunks:
            try:
                tokens = self._tokenize(query)
                scores = self._bm25_model.get_scores(tokens)
                ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k * 2]
                for rank, idx in enumerate(ranked_indices):
                    if scores[idx] > 0.05:
                        chunk_id = self._corpus_chunks[idx].get("rule_id") or self._corpus_chunks[idx].get("id")
                        bm25_results.append((chunk_id, scores[idx]))
            except Exception as e:
                logger.error(f"BM25 retrieval error: {e}")

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = {}
        rrf_k = settings.HYBRID_RRF_K

        for rank, (doc_id, _) in enumerate(dense_results):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

        for rank, (doc_id, _) in enumerate(bm25_results):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

        # Sort combined results by RRF score
        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda d: rrf_scores[d], reverse=True)[:top_k]

        # Retrieve full payload from corpus chunks
        payload_map = {c.get("rule_id") or c.get("id"): c for c in self._corpus_chunks}
        final_hits = []
        for doc_id in sorted_doc_ids:
            if doc_id in payload_map:
                item = payload_map[doc_id].copy()
                item["score"] = rrf_scores[doc_id]
                final_hits.append(item)

        return final_hits

    def scan_content(self, text: str) -> List[RuleFinding]:
        """
        Scan input text using Hybrid RAG semantic compliance matching.
        Evaluates sentences against retrieved brand guidelines.
        """
        self.initialize_bootstrap_rules()
        findings: List[RuleFinding] = []

        if not text or not text.strip():
            return findings

        # Segment text into sentences or paragraphs with character offsets
        # Regex captures sentence boundaries while tracking start/end offsets
        sentence_regex = re.compile(r"([A-Z0-9][^.!?\n]*[.!?]?)", re.MULTILINE)
        matches = list(sentence_regex.finditer(text))

        if not matches:
            matches = [re.match(r".*", text)]

        for match in matches:
            sentence = match.group(0).strip()
            if len(sentence) < 8:
                continue

            start_idx = match.start()
            end_idx = match.end()

            # Retrieve top related guidelines via Hybrid RAG
            related_rules = self.hybrid_search(sentence, top_k=3)

            for rule in related_rules:
                # Check for semantic violation triggers or trigger phrases
                trigger_phrases = rule.get("trigger_phrases", [])
                triggered = False
                matched_phrase = sentence

                # Direct trigger phrase match
                for phrase in trigger_phrases:
                    if phrase.lower() in sentence.lower():
                        triggered = True
                        matched_phrase = phrase
                        break

                # Heuristic semantic violation check:
                # If rule is an avoidance rule ("Never", "Do not", "Avoid") and query shares strong keywords
                if not triggered:
                    rule_text_lower = rule.get("rule_text", "").lower()
                    if ("never" in rule_text_lower or "avoid" in rule_text_lower or "prohibit" in rule_text_lower):
                        # Measure overlap with negative sentiment/hyperbolic words
                        hyperbolic_markers = ["fastest", "uncontested", "mind-blowing", "miracle", "unbeatable", "10x", "magic", "zero vulnerability", "unhackable"]
                        for marker in hyperbolic_markers:
                            if marker in sentence.lower() and marker in rule_text_lower:
                                triggered = True
                                matched_phrase = sentence
                                break

                if triggered:
                    # Calculate sub-span if possible
                    sub_start = start_idx
                    sub_end = end_idx
                    if matched_phrase != sentence:
                        try:
                            idx = sentence.lower().index(matched_phrase.lower())
                            sub_start = start_idx + idx
                            sub_end = sub_start + len(matched_phrase)
                        except ValueError:
                            pass

                    finding = RuleFinding(
                        id=f"rag-{uuid.uuid4().hex[:8]}",
                        rule_name=rule.get("title", "Brand Compliance Standard"),
                        category=rule.get("category", "Brand Governance"),
                        severity=rule.get("severity", "MEDIUM"),
                        confidence=round(min(0.92, 0.70 + rule.get("score", 0.1) * 5), 2),
                        original_text=text[sub_start:sub_end],
                        start_index=sub_start,
                        end_index=sub_end,
                        violation_description=f"Potential conflict with brand standard: {rule.get('title')}. {rule.get('rule_text')[:160]}...",
                        verbatim_source=rule.get("rule_text", ""),
                        source_document=rule.get("source_document", "Official Brand Guidelines"),
                        suggested_fix=rule.get("suggested_fix", "Restructure sentence to align with brand guidelines."),
                        engine="hybrid_rag"
                    )
                    findings.append(finding)
                    break  # One high-priority RAG finding per sentence to prevent noise

        return findings

    def get_all_rules(self) -> List[ActiveRule]:
        """Fetch all currently indexed active guidelines for the rules directory"""
        self.initialize_bootstrap_rules()
        client = self._get_qdrant_client()
        try:
            records, _ = client.scroll(
                collection_name=settings.QDRANT_COLLECTION,
                limit=500,
                with_payload=True
            )
            rules_list = []
            for record in records:
                p = record.payload or {}
                rules_list.append(
                    ActiveRule(
                        id=str(p.get("rule_id", record.id)),
                        title=p.get("title", "Standard Rule"),
                        category=p.get("category", "General"),
                        source_document=p.get("source_document", "Brand Guide"),
                        rule_text=p.get("rule_text", ""),
                        severity=p.get("severity", "MEDIUM"),
                        banned_terms=p.get("trigger_phrases"),
                        suggested_replacement=p.get("suggested_fix")
                    )
                )
            return rules_list
        except Exception as e:
            logger.error(f"Failed to fetch active rules: {e}")
            return []


# Module-level singleton
rag_service = HybridRAGEngine()
