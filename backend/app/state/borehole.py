# app/state/borehole.py

from typing import Annotated, List, Optional, TypedDict
from langgraph.graph.message import add_messages


class SoilLayer(TypedDict):
    depth_from: float
    depth_to: float
    uscs_code: str
    description: str
    colour: Optional[str]
    moisture: Optional[str]
    consistency: Optional[str]
    structure: Optional[str]
    inclusions: Optional[str]


class TestResult(TypedDict):
    depth: float
    test_type: str  # DCP, SPT, Vane, etc.
    value: float
    units: str


class BoreholeState(TypedDict):
    # Metadata
    project_id: str
    project_name: str
    borehole_id: str
    
    # Inputs for current processing
    depth_from: float
    depth_to: float
    photo_path: Optional[str]
    photo_base64: Optional[str]
    sample_id: Optional[str]
    
    # Cumulative Data
    soil_layers: List[SoilLayer]
    test_results: List[TestResult]
    
    # Agent Communication
    messages: Annotated[list, add_messages]
    last_agent: str
    error: Optional[str]
    
    # QA & Loop Control
    qa_score: float                     # 0.0 to 1.0
    qa_passed: bool
    qa_feedback: Optional[str]
    retry_count: int
    pending_human_review: bool
    
    # Internal Working Storage (current layer being classified)
    current_layer: Optional[SoilLayer]

    # Pipeline Extension (10 Agents)
    validation_errors: List[str]
    historical_context: Optional[str]
    compliance_check: Optional[str]
    executive_summary: Optional[str]
    dispatch_status: Optional[str]
    is_dispatched: bool
