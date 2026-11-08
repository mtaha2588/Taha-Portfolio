"""Deterministic tools the workflow agent can call.

Each tool is a small, testable function with clear inputs and outputs:
the same design you would expose to an LLM through tool calling. An LLM
planner/summariser can later be added on top without changing them.
"""

import re
from collections import defaultdict
from statistics import mean

from ...services.sanitize import clean_text

# ---------------------------------------------------------------- inquiries

INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "sales": ("price", "pricing", "quote", "cost", "buy", "purchase", "demo", "plan", "subscription", "trial"),
    "support": ("error", "bug", "broken", "not working", "issue", "problem", "help", "login", "crash", "down"),
    "billing": ("invoice", "refund", "charge", "payment", "billing", "receipt", "card"),
    "partnership": ("partner", "partnership", "collaborate", "integration", "reseller", "affiliate"),
    "complaint": ("disappointed", "unacceptable", "complaint", "angry", "terrible", "worst", "cancel"),
}
ROUTES = {
    "sales": "Sales team",
    "support": "Technical support",
    "billing": "Finance",
    "partnership": "Business development",
    "complaint": "Customer success lead",
    "general": "Shared inbox",
}
URGENCY_WORDS = ("urgent", "asap", "immediately", "today", "right now", "deadline", "critical", "emergency")
_MONEY = re.compile(r"(?:[$€£]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:usd|eur|gbp|dollars))", re.IGNORECASE)


def ingest_messages(messages: list[str]) -> list[str]:
    return [clean_text(m, multiline=True) for m in messages]


def classify_intent(text: str) -> tuple[str, list[str]]:
    lowered = text.lower()
    scores = {intent: [k for k in keys if k in lowered] for intent, keys in INTENT_KEYWORDS.items()}
    best = max(scores, key=lambda i: len(scores[i]))
    if not scores[best]:
        return "general", []
    return best, scores[best]


def extract_signals(text: str) -> dict:
    lowered = text.lower()
    return {
        "urgency_terms": [w for w in URGENCY_WORDS if w in lowered],
        "amounts": _MONEY.findall(text),
        "exclamations": text.count("!"),
        "question": "?" in text,
    }


def prioritize(intent: str, signals: dict) -> tuple[int, str]:
    score = 20
    score += 30 * min(len(signals["urgency_terms"]), 2)
    score += {"complaint": 25, "support": 15, "billing": 10, "sales": 10}.get(intent, 0)
    score += 10 if signals["amounts"] else 0
    score += 5 if signals["exclamations"] >= 2 else 0
    score = min(score, 100)
    level = "P1 - respond within 1 hour" if score >= 70 else "P2 - respond today" if score >= 45 else "P3 - respond within 2 days"
    return score, level


# ---------------------------------------------------------------- sales

def aggregate_sales(records: list[dict]) -> dict:
    by_product: dict[str, float] = defaultdict(float)
    by_region: dict[str, float] = defaultdict(float)
    for r in records:
        by_product[r["product"]] += r["amount"]
        by_region[r["region"]] += r["amount"]
    total = sum(r["amount"] for r in records)
    return {
        "total": round(total, 2),
        "count": len(records),
        "average": round(mean(r["amount"] for r in records), 2),
        "by_product": dict(sorted(((k, round(v, 2)) for k, v in by_product.items()), key=lambda kv: -kv[1])),
        "by_region": dict(sorted(((k, round(v, 2)) for k, v in by_region.items()), key=lambda kv: -kv[1])),
    }


def detect_trend(records: list[dict]) -> dict:
    ordered = sorted(records, key=lambda r: r["date"])
    half = len(ordered) // 2
    first = sum(r["amount"] for r in ordered[:half])
    second = sum(r["amount"] for r in ordered[half:])
    change = ((second - first) / first * 100) if first else None
    direction = "flat"
    if change is not None and change > 5:
        direction = "up"
    elif change is not None and change < -5:
        direction = "down"
    return {
        "period_start": ordered[0]["date"].isoformat(),
        "period_end": ordered[-1]["date"].isoformat(),
        "first_half_total": round(first, 2),
        "second_half_total": round(second, 2),
        "change_pct": round(change, 1) if change is not None else None,
        "direction": direction,
    }


def flag_insights(agg: dict, trend: dict) -> list[str]:
    insights = []
    top_product, top_value = next(iter(agg["by_product"].items()))
    share = top_value / agg["total"] * 100 if agg["total"] else 0
    insights.append(f"Top product: {top_product} ({share:.0f}% of revenue).")
    if share > 50 and len(agg["by_product"]) > 1:
        insights.append(f"Concentration risk: more than half of revenue comes from {top_product}.")
    if len(agg["by_region"]) > 1:
        weakest = list(agg["by_region"].items())[-1]
        insights.append(f"Lowest-revenue region: {weakest[0]}. Consider reviewing activity there.")
    if trend["change_pct"] is not None:
        verb = {"up": "grew", "down": "declined", "flat": "was roughly flat"}[trend["direction"]]
        insights.append(f"Revenue {verb} between the first and second half of the period ({trend['change_pct']:+.1f}%).")
    return insights
