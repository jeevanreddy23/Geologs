# app/graph.py

import os
from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

from app.state.borehole import BoreholeState
from app.agents.photo_agent import photo_agent
from app.agents.classifier_agent import classifier_agent
from app.agents.qa_agent import qa_agent
from app.agents.logger_agent import logger_agent
from app.agents.report_agent import report_agent

MAX_RETRIES = 3


# --- Routing functions ---

def route_after_qa(state: BoreholeState) -> Literal["logger_agent", "classifier_agent", "end_fail"]:
    """After QA review: pass -> commit to log; fail -> retry classifier (max 3x)."""
    if state.get("qa_passed"):
        return "logger_agent"
    retry = state.get("retry_count", 0)
    if retry >= MAX_RETRIES:
        return "end_fail"
    return "classifier_agent"


def route_after_classify(state: BoreholeState) -> Literal["qa_agent", "end_fail"]:
    """After classification: always go to QA gate. Error -> fail."""
    if state.get("error") and "classifier_agent" in state.get("error", ""):
        return "end_fail"
    return "qa_agent"


def route_after_photo(state: BoreholeState) -> Literal["classifier_agent", "end_fail"]:
    """After photo analysis: go to classifier. Error -> fail."""
    if state.get("error"):
        return "end_fail"
    return "classifier_agent"


def increment_retry(state: BoreholeState) -> dict:
    """Increment retry counter when routing back to classifier."""
    return {
        "retry_count": state.get("retry_count", 0) + 1,
        "qa_passed": False,
    }


def end_fail_node(state: BoreholeState) -> dict:
    """Terminal failure node - preserves error for API response."""
    return {
        "last_agent": "end_fail",
        "pending_human_review": True,
    }


# --- Build the graph ---

def build_graph():
    builder = StateGraph(BoreholeState)

    # Register nodes
    builder.add_node("photo_agent", photo_agent)
    builder.add_node("classifier_agent", classifier_agent)
    builder.add_node("increment_retry", increment_retry)
    builder.add_node("qa_agent", qa_agent)
    builder.add_node("logger_agent", logger_agent)
    builder.add_node("report_agent", report_agent)
    builder.add_node("end_fail", end_fail_node)

    # Entry: if photo provided -> photo_agent, else -> classifier directly
    builder.add_conditional_edges(
        START,
        lambda s: "photo_agent" if (s.get("photo_path") or s.get("photo_base64")) else "classifier_agent",
        {"photo_agent": "photo_agent", "classifier_agent": "classifier_agent"},
    )

    # Photo -> Classifier (conditional on error)
    builder.add_conditional_edges("photo_agent", route_after_photo,
                                  {"classifier_agent": "classifier_agent", "end_fail": "end_fail"})

    # Classifier -> QA gate (always, unless error)
    builder.add_conditional_edges("classifier_agent", route_after_classify,
                                  {"qa_agent": "qa_agent", "end_fail": "end_fail"})

    # QA -> Logger (pass) or -> increment_retry -> Classifier (fail, with retry budget)
    builder.add_conditional_edges("qa_agent", route_after_qa,
                                  {"logger_agent": "logger_agent",
                                   "classifier_agent": "increment_retry",
                                   "end_fail": "end_fail"})
    
    builder.add_edge("increment_retry", "classifier_agent")
    builder.add_edge("logger_agent", END)
    builder.add_edge("report_agent", END)
    builder.add_edge("end_fail", END)

    memory = InMemorySaver()
    return builder.compile(checkpointer=memory)

graph = build_graph()
