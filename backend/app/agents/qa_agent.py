import os
import json
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.state.borehole import BoreholeState

QA_SYSTEM = """Review classification. Respond ONLY with JSON."""

async def qa_agent(state: BoreholeState) -> dict:
    current = state.get("current_layer") or {}
    if not current.get("uscs_code"):
        return {"qa_score": 0.0, "qa_passed": False, "qa_feedback": "No USCS", "last_agent": "qa_agent"}

    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "mock":
        result = {"score": 0.95, "passed": True, "issues": [], "feedback": "Mock pass"}
    else:
        try:
            if provider == "anthropic":
                llm = ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
            else:
                llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))
            response = llm.invoke([SystemMessage(content=QA_SYSTEM), HumanMessage(content="Review this.")])
            result = json.loads(response.content.strip())
        except Exception as e:
            return {"qa_score": 0.0, "qa_passed": False, "qa_feedback": f"QA failed - {str(e)}", "last_agent": "qa_agent"}

    return {"qa_score": float(result.get("score", 0.5)), "qa_passed": bool(result.get("passed", False)), "qa_feedback": result.get("feedback", ""), "last_agent": "qa_agent", "error": None}
