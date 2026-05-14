# app/agents/photo_agent.py

import json
import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from app.state.borehole import BoreholeState
from app.tools.vision import encode_image_for_vision, extract_visual_descriptors_prompt


def get_llm():
    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "anthropic":
        return ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
    return ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))


async def photo_agent(state: BoreholeState) -> dict:
    """
    Processes field photo and extracts visual soil descriptors.
    Outputs: updates state with visual_descriptors inside current_layer.
    """
    if not state.get("photo_path") and not state.get("photo_base64"):
        return {
            "error": "photo_agent: No photo provided",
            "last_agent": "photo_agent",
        }

    # Get base64
    if state.get("photo_base64"):
        b64 = state["photo_base64"]
    else:
        try:
            b64 = encode_image_for_vision.invoke({"image_path": state["photo_path"]})
        except Exception as e:
            return {"error": f"photo_agent: Cannot read image - {e}", "last_agent": "photo_agent"}

    prompt_text = extract_visual_descriptors_prompt.invoke({"base64_image": b64})

    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "anthropic":
        from anthropic import Anthropic
        client = Anthropic()
        response = client.messages.create(
            model=os.getenv("MODEL_NAME", "claude-opus-4-6"),
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64",
                                                  "media_type": "image/jpeg",
                                                  "data": b64}},
                    {"type": "text", "text": prompt_text},
                ]
            }]
        )
        raw = response.content[0].text
    else:
        llm = ChatOpenAI(model="gpt-4o")
        msg = HumanMessage(content=[
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            {"type": "text", "text": prompt_text},
        ])
        response = llm.invoke([msg])
        raw = response.content

    try:
        descriptors = json.loads(raw.strip())
    except json.JSONDecodeError:
        descriptors = {"raw_response": raw, "confidence": 0.5}

    # Merge into current_layer
    current = state.get("current_layer") or {}
    current.update({
        "colour": descriptors.get("colour", ""),
        "moisture": descriptors.get("moisture_visual", ""),
        "structure": descriptors.get("structure_visible", ""),
        "inclusions": descriptors.get("inclusions_visible", ""),
        "_photo_confidence": descriptors.get("confidence", 0.5),
        "_texture": descriptors.get("texture", ""),
    })

    return {
        "current_layer": current,
        "last_agent": "photo_agent",
        "error": None,
    }
