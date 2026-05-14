# app/api/routes.py

import base64
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
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


@router.post("/log-interval")
async def log_interval(request: LogIntervalRequest):
    """
    Log a soil interval without a photo.
    The classifier agent will attempt classification from existing state context.
    """
    thread_id = f"{request.borehole_id}-{request.depth_from}-{request.depth_to}"
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "project_id": request.project_id,
        "project_name": request.project_name,
        "borehole_id": request.borehole_id,
        "depth_from": request.depth_from,
        "depth_to": request.depth_to,
        "sample_id": request.sample_id,
        "soil_layers": [],
        "test_results": [],
        "qa_score": 0.0,
        "qa_passed": False,
        "retry_count": 0,
        "messages": [],
        "last_agent": "start",
        "error": None,
        "pending_human_review": False,
        "current_layer": {
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
    project_id: str,
    project_name: str,
    borehole_id: str,
    depth_from: float,
    depth_to: float,
    sample_id: str = "",
    photo: UploadFile = File(...),
):
    """Log a soil interval with a field photo. Triggers photo -> classify -> QA -> log chain."""
    contents = await photo.read()
    b64 = base64.b64encode(contents).decode("utf-8")

    thread_id = f"{borehole_id}-{depth_from}-{depth_to}"
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "project_id": project_id,
        "project_name": project_name,
        "borehole_id": borehole_id,
        "depth_from": depth_from,
        "depth_to": depth_to,
        "sample_id": sample_id,
        "photo_base64": b64,
        "soil_layers": [],
        "test_results": [],
        "qa_score": 0.0,
        "qa_passed": False,
        "retry_count": 0,
        "messages": [],
        "last_agent": "start",
        "error": None,
        "pending_human_review": False,
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

    state = {
        "project_id": project_id,
        "project_name": project_name,
        "borehole_id": borehole_id,
        "soil_layers": [],      # ← Replace with real DB query in production
        "test_results": [],
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


@router.get("/health")
async def health():
    return {"status": "ok", "graph_nodes": list(graph.nodes.keys())}
