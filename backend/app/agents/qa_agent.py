# app/agents/qa_agent.py

import os
import json
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.state.borehole import BoreholeState
from app.tools.as1726 import USCS_CODES, MOISTURE_STATES, CONSISTENCY_STATES


QA_SYSTEM = """You are a strict AS 1726:2017 compliance reviewer.

Your job is to review a soil classification and rate it. Be harsh - field logs are legal documents.

Respond ONLY with this JSON:
{
  "score": <0.0 to 1.0>,
  "passed": <true if score >= 0.7>,
  "issues": ["list of specific problems found"],
  "feedback": "one sentence summary for the classifier agent to fix on retry"
}

Scoring guide:
- 1.0 = perfect AS 1726 compliance, all fields present and valid
- 0.7-0.9 = minor issues, acceptable
- 0.4-0.69 = significant issues, must retry
- 0.0-0.39 = fundamentally wrong, retry with fresh context"""


async def qa_agent(state: BoreholeState) -> dict:
    """
    Reviews the current_layer classification against AS 1726:2017.
    Returns qa_score, qa_passed, qa_feedback.
    If score < 0.7, supervisor will route back to classifier_agent.
    """
    current = state.get("current_layer") or {}

    if not current.get("uscs_code"):
        return {
            "qa_score": 0.0,
            "qa_passed": False,
            "qa_feedback": "No USCS code present - classification was not completed",
            "last_agent": "qa_agent",
        }

    required_fields = ["uscs_code", "colour", "moisture", "consistency", "description"]
    missing = [f for f in required_fields if not current.get(f)]

    review_prompt = f"""Review this soil classification for AS 1726:2017 compliance:

USCS Code: {current.get('uscs_code', 'MISSING')}
Description: {current.get('description', 'MISSING')}
Colour: {current.get('colour', 'MISSING')}
Moisture: {current.get('moisture', 'MISSING')}
Consistency: {current.get('consistency', 'MISSING')}
Structure: {current.get('structure', 'not recorded')}
Depth: {current.get('depth_from', '?')}m - {current.get('depth_to', '?')}m
Missing required fields: {missing if missing else 'none'}
Classifier confidence: {current.get('_classifier_confidence', 'unknown')}
Reasoning: {current.get('_reasoning', 'not provided')}

Valid USCS codes: {', '.join(list(USCS_CODES.keys()))}
Valid moisture states: {', '.join(MOISTURE_STATES)}

Score this classification."""

    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "anthropic":
        llm = ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
    else:
        llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))

    response = llm.invoke([
        SystemMessage(content=QA_SYSTEM),
        HumanMessage(content=review_prompt),
    ])

    try:
        result = json.loads(response.content.strip())
    except json.JSONDecodeError:
        return {
            "qa_score": 0.5,
            "qa_passed": False,
            "qa_feedback": "QA agent could not parse its own response - retry",
            "last_agent": "qa_agent",
        }

    return {
        "qa_score": float(result.get("score", 0.5)),
        "qa_passed": bool(result.get("passed", False)),
        "qa_feedback": result.get("feedback", ""),
        "last_agent": "qa_agent",
        "error": None,
    }
