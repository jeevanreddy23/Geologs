# app/graph.py

import os
from typing import Literal, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph_supervisor import create_supervisor

from app.llm_provider import create_chat_model, resolve_llm_config
from app.state.borehole import BoreholeState
from app.agents.validation_agent import validation_agent
from app.agents.photo_agent import photo_agent
from app.agents.historical_agent import historical_agent
from app.agents.classifier_agent import classifier_agent
from app.agents.compliance_agent import compliance_agent
from app.agents.qa_agent import qa_agent
from app.agents.summary_agent import summary_agent
from app.agents.logger_agent import logger_agent
from app.agents.report_agent import report_agent
from app.agents.dispatch_agent import dispatch_agent

def build_graph():
    config = resolve_llm_config()
    
    if config.provider == "mock" or not config.api_key or "your-key" in config.api_key:
        print("Using Mock LLM for supervisor (API key missing or provider=mock)")
        from langchain_community.chat_models.fake import FakeMessagesListChatModel
        from langchain_core.messages import AIMessage
        
        # Patching FakeMessagesListChatModel to support tool binding for supervisor
        class MockSupervisorLLM(FakeMessagesListChatModel):
            def bind_tools(self, tools, **kwargs):
                return self
        
        model = MockSupervisorLLM(responses=[AIMessage(content="I will delegate to validation_agent")])
    else:
        model = create_chat_model()
    
    # Ensure all agents have a name attribute for the supervisor
    agents = [
        validation_agent,
        photo_agent,
        historical_agent,
        classifier_agent,
        compliance_agent,
        qa_agent,
        summary_agent,
        logger_agent,
        report_agent,
        dispatch_agent
    ]
    for agent in agents:
        if not hasattr(agent, "name"):
            agent.name = agent.__name__
    
    workflow = create_supervisor(
        agents=agents,
        model=model,
        prompt=(
            """You are the Geotechnical Project Director. 
            Your goal is to process a borehole interval through the 10-stage pipeline:
            1. validation_agent: Always start here.
            2. photo_agent: If a photo is available.
            3. historical_agent: Gather context.
            4. classifier_agent: Classify the soil.
            5. compliance_agent: Check AS 1726 rules.
            6. qa_agent: Quality check. If it fails, you may need to re-classify.
            7. summary_agent: Create the executive summary.
            8. logger_agent: Save to database.
            9. report_agent: Generate the PDF.
            10. dispatch_agent: Finalize and notify.
            
            Follow the sequence strictly unless an error occurs.
            If an agent returns an error, stop and report it."""
        )
    )
    
    return workflow.compile(checkpointer=InMemorySaver())

graph = build_graph()
