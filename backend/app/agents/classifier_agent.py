import os
import json
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.state.borehole import BoreholeState
from app.tools.as1726 import validate_uscs_code, get_consistency_options, build_soil_description

CLASSIFIER_SYSTEM = """You are an expert geotechnical engineer specialising in AS 1726:2017 field logging. Respond ONLY with JSON."""

async def classifier_agent(state: BoreholeState) -> dict:
    current = state.get("current_layer") or {}
    user_prompt = "Classify soil."
    
    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "mock":
        result = {
            "uscs_code": "CH",
            "consistency": "firm",
            "moisture": "moist",
            "colour": "brown",
            "structure": "massive",
            "inclusions": "none",
            "confidence": 0.9,
            "reasoning": "Mock"
        }
    else:
        try:
            if provider == "anthropic":
                llm = ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
            else:
                llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))
            response = llm.invoke([SystemMessage(content=CLASSIFIER_SYSTEM), HumanMessage(content=user_prompt)])
            result = json.loads(response.content.strip())
        except Exception as e:
            return {"error": f"classifier_agent: LLM failed - {str(e)}", "last_agent": "classifier_agent"}

    validation = validate_uscs_code.invoke({"code": result.get("uscs_code", "")})
    description = build_soil_description.invoke({
        "uscs_code": result["uscs_code"],
        "colour": result.get("colour", ""),
        "moisture": result.get("moisture", "moist"),
        "consistency": result.get("consistency", "firm"),
        "structure": result.get("structure"),
        "inclusions": result.get("inclusions"),
    })

    updated_layer = {
        **current,
        "depth_from": state.get("depth_from", 0.0),
        "depth_to": state.get("depth_to", 0.0),
        "uscs_code": result["uscs_code"],
        "description": description,
        "colour": result.get("colour", ""),
        "moisture": result.get("moisture", ""),
        "consistency": result.get("consistency", ""),
        "_classifier_confidence": result.get("confidence", 0.5),
    }
    return {"current_layer": updated_layer, "last_agent": "classifier_agent", "error": None}
