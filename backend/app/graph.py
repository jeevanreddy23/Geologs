# app/graph.py

import os
from typing import Literal, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langchain_openai import ChatOpenAI
from langgraph_supervisor import create_supervisor

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

# Standardized Agent Wrapper for Supervisor
def agent_node(func, name):
    async def node(state: BoreholeState):
        result = await func(state)
        return {**result, "last_agent": name}
    return node

def build_graph():
    model = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))
    
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
