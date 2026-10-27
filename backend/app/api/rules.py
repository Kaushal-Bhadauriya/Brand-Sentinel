from fastapi import APIRouter
from app.services.rag import rag_service
from app.services.deterministic import DETERMINISTIC_RULES
from app.schemas.scan import RulesResponse, ActiveRule

router = APIRouter(prefix="/rules", tags=["Brand Rules"])


@router.get("", response_model=RulesResponse)
async def get_active_rules():
    """
    Retrieve all active brand compliance guidelines and deterministic rules
    currently indexed in the system.
    """
    rag_rules = rag_service.get_all_rules()

    # Also map deterministic rules into ActiveRule format for unified catalog
    deterministic_active: list[ActiveRule] = []
    for d in DETERMINISTIC_RULES:
        deterministic_active.append(
            ActiveRule(
                id=d["id"],
                title=d["name"],
                category=d["category"],
                source_document=d["source_document"],
                rule_text=d["description"],
                severity=d["severity"],
                banned_terms=d.get("exact_forbidden", [d["pattern"]]),
                suggested_replacement=d.get("suggested_fix")
            )
        )

    # Combine both catalogs (avoiding duplicate IDs)
    seen_ids = set()
    combined_rules = []
    for r in deterministic_active + rag_rules:
        if r.id not in seen_ids:
            seen_ids.add(r.id)
            combined_rules.append(r)

    return RulesResponse(
        total_rules=len(combined_rules),
        rules=combined_rules
    )
