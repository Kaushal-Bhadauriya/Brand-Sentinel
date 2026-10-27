import re
import uuid
from typing import List, Dict, Any
from app.schemas.scan import RuleFinding


# Comprehensive deterministic brand rules repository
DETERMINISTIC_RULES: List[Dict[str, Any]] = [
    # 1. Official Brand Nomenclature & Trademark rules
    {
        "id": "RULE-NAME-001",
        "name": "Official Product Brand Casing",
        "category": "Trademark",
        "severity": "HIGH",
        "confidence": 1.0,
        "pattern": r"(?i)\b(brand\s*sentinel|brandsentinel|brand-sentinel)\b",
        "exact_forbidden": ["brand sentinel", "brandsentinel", "brand-sentinel", "Brand Sentinel", "Brand-Sentinel"],
        "suggested_fix": "BrandSentinel",
        "description": "Product brand name must always be stylized as single-word CamelCase 'BrandSentinel' without spaces, hyphens, or lowercase.",
        "verbatim_source": "Brand Style Guide v4.2, Section 1.2: 'BrandSentinel must always appear as one compound word with capital B and capital S. Never hyphenate or separate into two words.'",
        "source_document": "Brand_Style_Guide_v4.2.pdf - Section 1.2"
    },
    {
        "id": "RULE-NAME-002",
        "name": "Mandatory Trademark Symbol on First Mention",
        "category": "Trademark",
        "severity": "MEDIUM",
        "confidence": 0.95,
        "pattern": r"\bBrandSentinel\b(?!\s*[\u00AE\u2122]|\u00AE|\u2122)",
        "condition": "first_mention_only",
        "suggested_fix": "BrandSentinel®",
        "description": "The first prominent mention of BrandSentinel in public marketing or press copy must include the registered trademark symbol (®).",
        "verbatim_source": "Brand Style Guide v4.2, Section 1.3: 'Include the registered trademark symbol (®) on the very first mention of BrandSentinel in all headers, body copy, and external communications.'",
        "source_document": "Brand_Style_Guide_v4.2.pdf - Section 1.3"
    },

    # 2. Inclusive & Modern Terminology
    {
        "id": "RULE-TERM-001",
        "name": "Inclusive Terminology: Whitelist / Blacklist",
        "category": "Terminology",
        "severity": "HIGH",
        "confidence": 1.0,
        "pattern": r"(?i)\bwhitelist(ed|ing|s)?\b",
        "suggested_fix": "allowlist",
        "description": "Outdated terminology 'whitelist' is strictly prohibited. Use 'allowlist', 'permitted list', or 'approved list'.",
        "verbatim_source": "Engineering & Brand Communication Handbook, Section 3.1: 'Do not use whitelist/blacklist in code comments, UI, or technical copy. Substitute with allowlist/blocklist.'",
        "source_document": "Communication_Handbook_2026.pdf - Section 3.1"
    },
    {
        "id": "RULE-TERM-002",
        "name": "Inclusive Terminology: Blacklist",
        "category": "Terminology",
        "severity": "HIGH",
        "confidence": 1.0,
        "pattern": r"(?i)\bblacklist(ed|ing|s)?\b",
        "suggested_fix": "blocklist",
        "description": "Outdated terminology 'blacklist' is strictly prohibited. Use 'blocklist' or 'denylist'.",
        "verbatim_source": "Engineering & Brand Communication Handbook, Section 3.1: 'Always use blocklist or denylist instead of blacklist across all customer-facing collateral.'",
        "source_document": "Communication_Handbook_2026.pdf - Section 3.1"
    },
    {
        "id": "RULE-TERM-003",
        "name": "Inclusive Terminology: Master/Slave Architecture",
        "category": "Terminology",
        "severity": "HIGH",
        "confidence": 1.0,
        "pattern": r"(?i)\bmaster[\s/-]+slave\b",
        "suggested_fix": "primary/replica",
        "description": "Hierarchical phrasing 'master/slave' is disallowed. Use 'primary/replica', 'control-plane/node', or 'active/standby'.",
        "verbatim_source": "Communication Handbook 2026, Section 3.2: 'Replace master/slave with primary/replica or main/worker in all product and system documentation.'",
        "source_document": "Communication_Handbook_2026.pdf - Section 3.2"
    },
    {
        "id": "RULE-TERM-004",
        "name": "Corporate Jargon & Colloquialisms",
        "category": "Tone & Voice",
        "severity": "LOW",
        "confidence": 0.90,
        "pattern": r"(?i)\b(rockstar|ninja|guru)s?\b",
        "suggested_fix": "specialist",
        "description": "Hyperbolic colloquial job titles such as 'ninja', 'rockstar', or 'guru' weaken professional credibility.",
        "verbatim_source": "Editorial Style Guide, Section 4.4: 'Avoid gimmicky idioms (rockstar, coding ninja). Use precise professional descriptors like engineer, specialist, or architect.'",
        "source_document": "Editorial_Style_Guide.pdf - Section 4.4"
    },
    {
        "id": "RULE-TERM-005",
        "name": "Correct Technical Terminology: On-Premises",
        "category": "Terminology",
        "severity": "MEDIUM",
        "confidence": 0.95,
        "pattern": r"(?i)\bon-premise\b",
        "suggested_fix": "on-premises",
        "description": "'On-premise' means a proposition/hypothesis. The correct adjective for self-hosted software is 'on-premises'.",
        "verbatim_source": "Product Marketing Glossary 2026: 'Always write on-premises (plural) when describing local deployment infrastructure, never on-premise.'",
        "source_document": "Product_Marketing_Glossary.pdf - Page 18"
    },
    {
        "id": "RULE-TERM-006",
        "name": "Compound Adjective Hyphenation: AI-Powered",
        "category": "Formatting",
        "severity": "LOW",
        "confidence": 0.95,
        "pattern": r"(?i)\bAI\s+powered\b",
        "suggested_fix": "AI-powered",
        "description": "Compound modifiers preceding a noun must be hyphenated: 'AI-powered governance', not 'AI powered'.",
        "verbatim_source": "Editorial Style Guide, Section 2.7: 'Compound modifiers preceding nouns require hyphenation (e.g. AI-powered, cloud-native, real-time).'",
        "source_document": "Editorial_Style_Guide.pdf - Section 2.7"
    },

    # 3. Legal Disclosures, Puffery & Unsubstantiated Guarantees
    {
        "id": "RULE-LEGAL-001",
        "name": "Absolute Security Claim (FTC Compliance)",
        "category": "Legal Disclosure",
        "severity": "HIGH",
        "confidence": 1.0,
        "pattern": r"(?i)\b(100% (safe|secure|bulletproof|unhackable)|completely unhackable|zero vulnerability guarantee)\b",
        "suggested_fix": "enterprise-grade security with continuous compliance monitoring",
        "description": "Absolute security warranties violate compliance and FTC truth-in-advertising guidelines. No software system can guarantee 100% security.",
        "verbatim_source": "Legal & Regulatory Compliance Standards v3.0, Section 5.1: 'Never claim that BrandSentinel or any service is 100% unhackable or impenetrable. State our SOC 2 Type II compliance and defense-in-depth architecture instead.'",
        "source_document": "Legal_Compliance_Standards_v3.pdf - Section 5.1"
    },
    {
        "id": "RULE-LEGAL-002",
        "name": "Unsubstantiated Performance Superlatives",
        "category": "Claims",
        "severity": "HIGH",
        "confidence": 0.95,
        "pattern": r"(?i)\b(fastest in the world|#1 AI platform in the world|guaranteed 100% ROI)\b",
        "suggested_fix": "industry-leading performance validated by enterprise benchmark studies",
        "description": "Unqualified superlative claims ('fastest in the world', 'guaranteed ROI') create legal exposure without third-party audit citations.",
        "verbatim_source": "Legal & Regulatory Compliance Standards v3.0, Section 4.2: 'Superlatives must be substantiated with an approved footnote citing the source benchmark and date.'",
        "source_document": "Legal_Compliance_Standards_v3.pdf - Section 4.2"
    },
    {
        "id": "RULE-LEGAL-003",
        "name": "Unrestricted Free Claims",
        "category": "Legal Disclosure",
        "severity": "MEDIUM",
        "confidence": 0.90,
        "pattern": r"(?i)\b(completely free forever|free with no strings attached)\b",
        "suggested_fix": "free tier available, subject to terms of service",
        "description": "Commercial product offers cannot promise 'free forever' without qualifying terms and fair usage conditions.",
        "verbatim_source": "Legal Compliance Standards v3.0, Section 6.3: 'All free tier mentions must be accompanied by a disclaimer indicating terms of service apply.'",
        "source_document": "Legal_Compliance_Standards_v3.pdf - Section 6.3"
    },

    # 4. Outdated Brand References & Competitor Defamation
    {
        "id": "RULE-BRAND-001",
        "name": "Outdated Partner / Brand Names",
        "category": "Terminology",
        "severity": "MEDIUM",
        "confidence": 0.95,
        "pattern": r"(?i)\b(Twitter API|Facebook Inc|G Suite)\b",
        "suggested_fix": "X API / Meta / Google Workspace",
        "description": "Outdated entity name detected. Maintain brand freshness by using current trade designations.",
        "verbatim_source": "Partner & Ecosystem Reference Guide 2026: 'Ensure all third-party ecosystem references use current legal names (X API, Meta Platforms, Google Workspace).'",
        "source_document": "Partner_Reference_Guide_2026.pdf - Page 7"
    },
    {
        "id": "RULE-TONE-001",
        "name": "Negative Competitor Denigration",
        "category": "Tone & Voice",
        "severity": "HIGH",
        "confidence": 0.95,
        "pattern": r"(?i)\b(competitor\s*x\s+is\s+(terrible|garbage|useless|broken)|legacy competitors are obsolete junk)\b",
        "suggested_fix": "in contrast to traditional legacy governance tools",
        "description": "Unprofessional disparagement of competitors directly contradicts BrandSentinel's authoritative, professional tone of voice.",
        "verbatim_source": "Brand Style Guide v4.2, Section 3.4: 'We elevate through our own technological merits. Never use derogatory or sensational language when comparing against competitors.'",
        "source_document": "Brand_Style_Guide_v4.2.pdf - Section 3.4"
    }
]


class DeterministicScanner:
    """
    Sub-millisecond regex and dictionary-based compliance engine.
    Scans input text against verified brand rules and generates exact byte spans.
    """

    def __init__(self, rules: List[Dict[str, Any]] = None):
        self.rules = rules or DETERMINISTIC_RULES

    def scan(self, text: str, strict_mode: bool = True) -> List[RuleFinding]:
        """
        Execute deterministic rule evaluation over input text.
        Returns a list of structured RuleFinding objects with exact character indices.
        """
        findings: List[RuleFinding] = []
        if not text:
            return findings

        # Track first mention of brand name for Rule-NAME-002
        has_found_brand_sentinel_first = False

        for rule in self.rules:
            # Skip optional rules if strict mode disabled
            if not strict_mode and rule.get("severity") == "LOW":
                continue

            pattern_str = rule.get("pattern")
            if not pattern_str:
                continue

            regex = re.compile(pattern_str)
            for match in regex.finditer(text):
                start = match.start()
                end = match.end()
                matched_text = match.group(0)

                # Special handling for Trademark first-mention rule
                if rule.get("id") == "RULE-NAME-002":
                    if has_found_brand_sentinel_first:
                        # Only flag if it's the very first occurrence
                        continue
                    has_found_brand_sentinel_first = True

                # Special check for product brand casing rule
                if rule.get("id") == "RULE-NAME-001":
                    # Only flag if matched text is NOT already the exact desired casing "BrandSentinel"
                    if matched_text == "BrandSentinel":
                        continue

                # Generate clean fix suggestion
                suggested_fix = rule["suggested_fix"]
                # Preserve capitalization nuance if applicable
                if matched_text.isupper() and len(suggested_fix) > 1:
                    suggested_fix = suggested_fix.upper()

                finding = RuleFinding(
                    id=f"det-{uuid.uuid4().hex[:8]}",
                    rule_name=rule["name"],
                    category=rule["category"],
                    severity=rule["severity"],
                    confidence=rule["confidence"],
                    original_text=matched_text,
                    start_index=start,
                    end_index=end,
                    violation_description=rule["description"],
                    verbatim_source=rule["verbatim_source"],
                    source_document=rule["source_document"],
                    suggested_fix=suggested_fix,
                    engine="deterministic"
                )
                findings.append(finding)

        # Sort findings by start_index for predictable editor highlighting
        findings.sort(key=lambda x: x.start_index)
        return findings


# Module-level singleton
deterministic_engine = DeterministicScanner()
