# app/api/routes.py

import base64
import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict
from app.graph import graph

router = APIRouter(prefix="/api/v1")


class LogIntervalRequest(BaseModel):
    project_id: str
    project_name: str
    borehole_id: str
    depth_from: float
    depth_to: float
    sample_id: str = ""
    # Optional manual overrides (user can pre-fill these)
    colour: Optional[str] = None
    moisture: Optional[str] = None
    consistency: Optional[str] = None
    notes: Optional[str] = None


class LogIntervalWithPhotoRequest(LogIntervalRequest):
    photo_base64: Optional[str] = None


class TemplateGenerateRequest(BaseModel):
    template_id: str
    replacements: Dict[str, str]
    selected_historical_report_path: Optional[str] = None


class ExtractRequest(BaseModel):
    file_path: str


@router.post("/log-interval")
async def log_interval(request: LogIntervalRequest):
    """
    Log a soil interval without a photo.
    The classifier agent will attempt classification from existing state context.
    """
    thread_id = f"{request.project_id}-{request.borehole_id}"
    config = {"configurable": {"thread_id": thread_id}}

    # Try to get existing state to preserve soil_layers
    existing_state = await graph.aget_state(config)
    soil_layers = []
    test_results = []
    if existing_state and existing_state.values:
        soil_layers = existing_state.values.get("soil_layers", [])
        test_results = existing_state.values.get("test_results", [])

    initial_state = {
        "project_id": request.project_id,
        "project_name": request.project_name,
        "borehole_id": request.borehole_id,
        "depth_from": request.depth_from,
        "depth_to": request.depth_to,
        "sample_id": request.sample_id,
        "soil_layers": soil_layers,
        "test_results": test_results,
        "qa_score": 0.0,
        "qa_passed": False,
        "retry_count": 0,
        "messages": [],
        "last_agent": "start",
        "error": None,
        "pending_human_review": False,
        "validation_errors": [],
        "historical_context": None,
        "compliance_check": None,
        "executive_summary": None,
        "dispatch_status": None,
        "is_dispatched": False,
        "current_layer": {
            "depth_from": request.depth_from,
            "depth_to": request.depth_to,
            "colour": request.colour or "",
            "moisture": request.moisture or "",
            "consistency": request.consistency or "",
        },
    }

    result = await graph.ainvoke(initial_state, config=config)

    if result.get("pending_human_review"):
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Classification failed QA after 3 retries - human review required",
                "error": result.get("error"),
                "qa_score": result.get("qa_score"),
                "qa_feedback": result.get("qa_feedback"),
            }
        )

    return {
        "status": "logged",
        "layer": result.get("soil_layers", [])[-1] if result.get("soil_layers") else None,
        "qa_score": result.get("qa_score"),
        "total_layers": len(result.get("soil_layers") or []),
    }


@router.post("/log-interval-photo")
async def log_interval_with_photo(
    project_id: str = Form(...),
    project_name: str = Form(...),
    borehole_id: str = Form(...),
    depth_from: float = Form(...),
    depth_to: float = Form(...),
    sample_id: str = Form(""),
    photo: UploadFile = File(...),
):
    """Log a soil interval with a field photo. Triggers photo -> classify -> QA -> log chain."""
    contents = await photo.read()
    b64 = base64.b64encode(contents).decode("utf-8")

    thread_id = f"{project_id}-{borehole_id}"
    config = {"configurable": {"thread_id": thread_id}}

    # Try to get existing state to preserve soil_layers
    existing_state = await graph.aget_state(config)
    soil_layers = []
    test_results = []
    if existing_state and existing_state.values:
        soil_layers = existing_state.values.get("soil_layers", [])
        test_results = existing_state.values.get("test_results", [])

    initial_state = {
        "project_id": project_id,
        "project_name": project_name,
        "borehole_id": borehole_id,
        "depth_from": depth_from,
        "depth_to": depth_to,
        "sample_id": sample_id,
        "photo_base64": b64,
        "soil_layers": soil_layers,
        "test_results": test_results,
        "qa_score": 0.0,
        "qa_passed": False,
        "retry_count": 0,
        "messages": [],
        "last_agent": "start",
        "error": None,
        "pending_human_review": False,
        "validation_errors": [],
        "historical_context": None,
        "compliance_check": None,
        "executive_summary": None,
        "dispatch_status": None,
        "is_dispatched": False,
    }

    result = await graph.ainvoke(initial_state, config=config)

    if result.get("pending_human_review"):
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Classification failed QA after 3 retries - human review required",
                "error": result.get("error"),
                "qa_score": result.get("qa_score"),
                "qa_feedback": result.get("qa_feedback"),
            }
        )

    return {
        "status": "logged",
        "layer": result.get("soil_layers", [])[-1] if result.get("soil_layers") else None,
        "qa_score": result.get("qa_score"),
        "total_layers": len(result.get("soil_layers") or []),
    }


@router.post("/generate-report/{borehole_id}")
async def generate_report(borehole_id: str, project_id: str, project_name: str):
    """Generate AS 1726:2017 PDF report for a completed borehole."""
    from app.agents.report_agent import report_agent

    thread_id = f"{project_id}-{borehole_id}"
    config = {"configurable": {"thread_id": thread_id}}
    
    existing_state = await graph.aget_state(config)
    soil_layers = []
    test_results = []
    if existing_state and existing_state.values:
        soil_layers = existing_state.values.get("soil_layers", [])
        test_results = existing_state.values.get("test_results", [])

    state = {
        "project_id": project_id,
        "project_name": project_name,
        "borehole_id": borehole_id,
        "soil_layers": soil_layers,
        "test_results": test_results,
        "messages": [],
    }

    result = await report_agent(state)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return FileResponse(
        path=result["report_path"],
        media_type="application/pdf",
        filename=f"{borehole_id}_log.pdf",
    )


@router.get("/templates")
async def get_templates():
    """List all templates in Main STS Templates folder."""
    from app.utils.template_manager import list_templates
    try:
        return list_templates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/placeholders")
async def get_template_placeholders(template_id: str):
    """Scan and retrieve all bracketed placeholders inside a selected template."""
    from app.utils.template_manager import extract_placeholders, TEMPLATES_DIR
    try:
        path_suffix = template_id.replace("/", os.sep)
        full_path = os.path.join(TEMPLATES_DIR, path_suffix)
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Template file not found")
        return {
            "template_id": template_id,
            "placeholders": extract_placeholders(full_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/generate")
async def generate_from_template(request: TemplateGenerateRequest):
    """Instantiate a completed geotechnical report .docx by replacing all template placeholders via a Multi-Agent Swarm."""
    from app.utils.template_manager import TEMPLATES_DIR
    from app.agents.template_swarm import template_swarm
    try:
        path_suffix = request.template_id.replace("/", os.sep)
        template_path = os.path.join(TEMPLATES_DIR, path_suffix)
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=404, detail="Template not found")
            
        initial_state = {
            "template_id": request.template_id,
            "template_path": template_path,
            "selected_historical_report_path": request.selected_historical_report_path,
            "input_replacements": request.replacements,
            "placeholders": [],
            "replacements": {},
            "compliance_check": "",
            "qa_score": 0.0,
            "qa_passed": False,
            "qa_feedback": [],
            "output_path": None,
            "dispatch_status": "",
            "messages": [],
            "last_agent": "",
            "error": None
        }
        
        # Invoke our production-grade multi-agent geotechnical swarm!
        result = await template_swarm.ainvoke(initial_state)
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
            
        completed_path = result.get("output_path")
        if not completed_path or not os.path.exists(completed_path):
            raise HTTPException(status_code=500, detail="Compilation agent failed to generate output path.")
            
        file_name = f"Generated_{os.path.basename(template_path)}"
        
        # Expose QA score and compliance checks via response headers
        headers = {
            "X-QA-Score": str(result.get("qa_score", 0.0)),
            "X-QA-Passed": "true" if result.get("qa_passed", False) else "false",
            "X-Compliance-Check": result.get("compliance_check", ""),
            "Access-Control-Expose-Headers": "X-QA-Score, X-QA-Passed, X-Compliance-Check"
        }
        
        return FileResponse(
            path=completed_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=file_name,
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/history")
async def get_reports_history():
    """List completed historical reports inside Reports 1, 2, 3 directories."""
    from app.utils.template_manager import list_history
    try:
        return list_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/history/extract")
async def extract_report_variables(request: ExtractRequest):
    """Triggers smart extraction agent to pull all client and site address parameters from a completed report."""
    from app.utils.template_manager import extract_variables_from_docx
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
            
        data = extract_variables_from_docx(request.file_path)
        return {
            "status": "success",
            "extracted_data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {"status": "ok", "graph_nodes": list(graph.nodes.keys())}
