"""Built-in workflow agent.

The agent follows an explicit plan of tool calls, timing and logging
every step, so the frontend can visualise the run stage by stage.
`engine` is reported honestly as "rule-based": no language model is
called in the built-in version. To add one, keep these tools and let an
LLM choose and sequence them (tool calling), or point
AUTOMATION_AGENT_SERVICE_URL at your real agent service.
"""

import time
import uuid
from collections import Counter
from collections.abc import Callable
from typing import Any

from . import tools
from .schemas import InquiryTriageRequest, SalesSummaryRequest, StepLog, WorkflowRun

ENGINE = "rule-based (deterministic tools, no LLM)"


class _Recorder:
    def __init__(self) -> None:
        self.steps: list[StepLog] = []

    def run(self, stage: str, tool: str, description: str, fn: Callable[[], Any], summarize: Callable[[Any], str]) -> Any:
        start = time.perf_counter()
        output = fn()
        elapsed = (time.perf_counter() - start) * 1000
        self.steps.append(
            StepLog(
                index=len(self.steps) + 1,
                stage=stage,
                tool=tool,
                description=description,
                duration_ms=round(elapsed, 3),
                output_summary=summarize(output),
            )
        )
        return output


def _triage(req: InquiryTriageRequest) -> WorkflowRun:
    rec = _Recorder()
    messages = rec.run("input", "ingest_messages", "Clean and normalise incoming messages",
                       lambda: tools.ingest_messages(req.messages), lambda m: f"{len(m)} messages ingested")

    intents = rec.run("processing", "classify_intent", "Classify each message by intent using keyword evidence",
                      lambda: [tools.classify_intent(m) for m in messages],
                      lambda out: ", ".join(f"{k}: {v}" for k, v in Counter(i for i, _ in out).items()))

    signals = rec.run("processing", "extract_signals", "Extract urgency terms and monetary amounts",
                      lambda: [tools.extract_signals(m) for m in messages],
                      lambda out: f"{sum(bool(s['urgency_terms']) for s in out)} urgent, "
                                  f"{sum(bool(s['amounts']) for s in out)} mention amounts")

    def decide():
        items = []
        for i, (msg, (intent, evidence), sig) in enumerate(zip(messages, intents, signals), start=1):
            score, level = tools.prioritize(intent, sig)
            items.append({
                "id": i,
                "preview": msg[:90] + ("…" if len(msg) > 90 else ""),
                "intent": intent,
                "evidence": evidence,
                "route_to": tools.ROUTES[intent],
                "priority_score": score,
                "priority": level,
                "signals": sig,
            })
        return sorted(items, key=lambda x: -x["priority_score"])

    triaged = rec.run("decision", "prioritize_and_route", "Score priority and route each message to a team", decide,
                      lambda out: f"{sum(x['priority'].startswith('P1') for x in out)} P1, "
                                  f"{sum(x['priority'].startswith('P2') for x in out)} P2, "
                                  f"{sum(x['priority'].startswith('P3') for x in out)} P3")

    def report():
        lines = ["# Inquiry triage report", "", f"{len(triaged)} messages processed.", "",
                 "| # | Priority | Intent | Route to | Preview |", "|---|---|---|---|---|"]
        for x in triaged:
            preview = x["preview"].replace("|", "/").replace("\n", " ")
            lines.append(f"| {x['id']} | {x['priority'].split(' ')[0]} | {x['intent']} | {x['route_to']} | {preview} |")
        return "\n".join(lines)

    markdown = rec.run("output", "compose_report", "Generate a structured triage report", report,
                       lambda md: f"{len(md.splitlines())}-line markdown report")

    return WorkflowRun(
        run_id=uuid.uuid4().hex[:12], task=req.task, engine=ENGINE, steps=rec.steps,
        result={"items": triaged}, report_markdown=markdown,
        notes=["Classification uses transparent keyword rules so every decision can be explained."],
    )


def _sales(req: SalesSummaryRequest) -> WorkflowRun:
    rec = _Recorder()
    records = rec.run("input", "validate_records", "Validate and load sales records",
                      lambda: [r.model_dump() for r in req.records], lambda r: f"{len(r)} valid records")
    agg = rec.run("processing", "aggregate_sales", "Aggregate revenue by product and region",
                  lambda: tools.aggregate_sales(records),
                  lambda a: f"total {a['total']:,.2f} across {len(a['by_product'])} products")
    trend = rec.run("processing", "detect_trend", "Compare the first and second half of the period",
                    lambda: tools.detect_trend(records),
                    lambda t: f"trend {t['direction']} ({t['change_pct']}%)" if t["change_pct"] is not None else "trend n/a")
    insights = rec.run("decision", "flag_insights", "Decide which findings deserve attention",
                       lambda: tools.flag_insights(agg, trend), lambda i: f"{len(i)} insights flagged")

    def report():
        lines = ["# Sales summary", "", f"Period: {trend['period_start']} to {trend['period_end']}",
                 f"Total revenue: {agg['total']:,.2f} from {agg['count']} sales (average {agg['average']:,.2f}).",
                 "", "## Key insights", *[f"- {i}" for i in insights], "", "## Revenue by product"]
        lines += [f"- {k}: {v:,.2f}" for k, v in agg["by_product"].items()]
        lines += ["", "## Revenue by region"] + [f"- {k}: {v:,.2f}" for k, v in agg["by_region"].items()]
        return "\n".join(lines)

    markdown = rec.run("output", "compose_report", "Generate the written summary report", report,
                       lambda md: f"{len(md.splitlines())}-line markdown report")

    return WorkflowRun(
        run_id=uuid.uuid4().hex[:12], task=req.task, engine=ENGINE, steps=rec.steps,
        result={"aggregates": agg, "trend": trend, "insights": insights}, report_markdown=markdown,
        notes=["All figures are computed from the records you sent; nothing is estimated."],
    )


def run_workflow(req: InquiryTriageRequest | SalesSummaryRequest) -> WorkflowRun:
    if isinstance(req, InquiryTriageRequest):
        return _triage(req)
    return _sales(req)


SAMPLES = {
    "inquiry_triage": {
        "task": "inquiry_triage",
        "messages": [
            "Hi, could you send me pricing for the annual plan for a team of 12? We'd like a quote this week.",
            "URGENT: our dashboard login is broken and the whole team is blocked today!!",
            "We were charged twice on our last invoice, can you issue a refund?",
            "We run an agency and would love to discuss a partnership / integration with your API.",
            "Just wanted to say the new update looks great, thanks.",
        ],
    },
    "sales_summary": {
        "task": "sales_summary",
        "records": [
            {"date": "2026-01-05", "product": "Starter Plan", "region": "North America", "amount": 1200},
            {"date": "2026-01-12", "product": "Pro Plan", "region": "Europe", "amount": 3400},
            {"date": "2026-01-19", "product": "Pro Plan", "region": "North America", "amount": 3100},
            {"date": "2026-01-26", "product": "Consulting", "region": "Asia Pacific", "amount": 2200},
            {"date": "2026-02-02", "product": "Pro Plan", "region": "Europe", "amount": 3900},
            {"date": "2026-02-09", "product": "Starter Plan", "region": "Asia Pacific", "amount": 900},
            {"date": "2026-02-16", "product": "Pro Plan", "region": "North America", "amount": 4200},
            {"date": "2026-02-23", "product": "Consulting", "region": "Europe", "amount": 2600},
        ],
    },
}
