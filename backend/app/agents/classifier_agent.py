# app/agents/classifier_agent.py

import os
import json
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.state.borehole import BoreholeState
from app.tools.as1726 import validate_uscs_code, get_consistency_options, build_soil_description


CLASSIFIER_SYSTEM = """You are an expert geotechnical engineer specialising in AS 1726:2017 field logging.

Given soil descriptors, assign the correct USCS classification code and complete all required fields.

Respond ONLY with this JSON (no markdown):
{
  "uscs_code": "<2-letter USCS code>",
  "consistency": "<consistency from AS 1726 table>",
  "moisture": "<dry|slightly moist|moist|very moist|wet>",
  "colour": "<colour descriptor>",
  "structure": "<massive|stratified|fissured|laminated|null>",
  "inclusions": "<description or null>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<one sentence justification>"
}"""


async def classifier_agent(state: BoreholeState) -> dict:
    """
    Classifies soil based on photo descriptors + field observations.
    Outputs: completes current_layer with USCS code and all AS 1726 fields.
    """
    current = state.get("current_layer") or {}

    user_prompt = f"""Classify this soil sample per AS 1726:2017:

Depth interval: {state.get('depth_from', '?')}m - {state.get('depth_to', '?')}m
Visual colour: {current.get('colour', 'not recorded')}
Visible texture: {current.get('_texture', 'not recorded')}
Visible moisture: {current.get('moisture', 'not recorded')}
Visible structure: {current.get('structure', 'not recorded')}
Inclusions: {current.get('inclusions', 'none observed')}
Photo confidence: {current.get('_photo_confidence', 0.5)}

Assign USCS code and complete all descriptors."""

    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "anthropic":
        llm = ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
    else:
        llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))

    response = llm.invoke([
        SystemMessage(content=CLASSIFIER_SYSTEM),
        HumanMessage(content=user_prompt),
    ])

    try:
        result = json.loads(response.content.strip())
    except json.JSONDecodeError:
        return {
            "error": "classifier_agent: Could not parse classification response",
            "last_agent": "classifier_agent",
        }

    # Validate USCS code against AS 1726 table
    validation = validate_uscs_code.invoke({"code": result.get("uscs_code", "")})
    if not validation["valid"]:
        return {
            "error": f"classifier_agent: Invalid USCS code '{result.get('uscs_code')}'. {validation['suggestion']}",
            "last_agent": "classifier_agent",
            "qa_score": 0.2,
        }

    # Build formal description
    description = build_soil_description.invoke({
        "uscs_code": result["uscs_code"],
        "colour": result.get("colour", current.get("colour", "")),
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
        "colour": result.get("colour", current.get("colour", "")),
        "moisture": result.get("moisture", ""),
        "consistency": result.get("consistency", ""),
        "structure": result.get("structure", ""),
        "inclusions": result.get("inclusions", ""),
        "_classifier_confidence": result.get("confidence", 0.5),
        "_reasoning": result.get("reasoning", ""),
    }

    return {
        "current_layer": updated_layer,
        "last_agent": "classifier_agent",
        "error": None,
    }
