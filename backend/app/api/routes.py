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
    project_path: Optional[str] = None


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


from typing import List

class SuggestFieldsRequest(BaseModel):
    template_id: str
    placeholders: List[str]
    selected_historical_report_path: Optional[str] = None
    project_path: Optional[str] = None


@router.post("/templates/suggest-fields")
async def suggest_template_fields(request: SuggestFieldsRequest):
    """
    Sends targeted keyword requests straight to the ColBERT index and returns pre-filled defaults.
    """
    from app.utils.rag_manager import build_index_from_reports, search_rag_late_interaction
    from app.utils.template_manager import extract_placeholders, extract_variables_from_docx
    from app.agents.template_swarm import extract_value_via_llm, extract_field_value_from_chunk
    
    try:
        # Step A: Ensure ColBERT index is initialized
        print("[UI Engine Builder Agent] Triggering build_index_from_reports...", flush=True)
        build_index_from_reports(limit=15)
        
        suggestions = {}
        hist_path = request.selected_historical_report_path
        
        placeholders = list(request.placeholders)
        core_fields = ["CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER", "BEARING_CAPACITY"]
        for cf in core_fields:
            if cf not in placeholders:
                placeholders.append(cf)
        
        # Regex baseline extraction if selected_historical_report_path is provided
        if hist_path and os.path.exists(hist_path):
            print(f"[UI Engine Builder Agent] Running regex parser on: {os.path.basename(hist_path)}", flush=True)
            extracted_data = extract_variables_from_docx(hist_path)
            for k, v in extracted_data.items():
                if k in placeholders and v:
                    suggestions[k] = v

        # If project_path is provided, we can also query project-specific RAG/OCR variables
        if request.project_path and os.path.exists(request.project_path):
            try:
                from app.utils.rag_manager import analyze_project_folder
                analysis = analyze_project_folder(request.project_path)
                mappings = {
                    "CLIENT": "client",
                    "CLIENT_NAME": "client",
                    "ADDRESS": "site_address",
                    "SITE_ADDRESS": "site_address",
                    "JOB_NO": "job_no",
                    "BEARING_CAPACITY": "bearing_capacity"
                }
                for placeholder, analysis_key in mappings.items():
                    if placeholder in placeholders and not suggestions.get(placeholder) and analysis.get(analysis_key):
                        suggestions[placeholder] = analysis[analysis_key]
                if "NOTES" in placeholders and not suggestions.get("NOTES") and analysis.get("summary"):
                    suggestions["NOTES"] = analysis["summary"]
            except Exception as e:
                print(f"[UI Engine Builder Agent] Error auto-filling from project_path: {e}", flush=True)

        QUERY_MAPPINGS = {
            "CLIENT": "Client Name",
            "CLIENT_NAME": "Client Name",
            "ADDRESS": "Project Address",
            "SITE_ADDRESS": "Project Address",
            "JOB_NO": "Job Number",
            "REPORT_NO": "Report Number",
            "DATE": "Report Date",
            "ENGINEER": "Author Engineer",
            "BEARING_CAPACITY": "allowable bearing capacity"
        }
        
        # Query ColBERT for remaining blank placeholders
        for ph in placeholders:
            if not suggestions.get(ph):
                query_term = QUERY_MAPPINGS.get(ph, ph.replace("_", " ").title())
                print(f"[UI Engine Builder Agent] Querying ColBERT for keyword '{ph}' -> '{query_term}'...", flush=True)
                
                results = search_rag_late_interaction(query_term, limit=3, file_path=hist_path)
                if results:
                    top_chunk = results[0]
                    chunk_text = top_chunk["chunk_text"]
                    
                    # Try to extract via LLM
                    val = await extract_value_via_llm(ph, chunk_text)
                    if not val:
                        val = extract_field_value_from_chunk(ph, chunk_text)
                    if not val:
                        val = chunk_text.split("\n")[0][:150].strip()
                        
                    if val:
                        suggestions[ph] = val
                        
        # Cross-fill Client & Client Name
        if "CLIENT" in suggestions and "CLIENT_NAME" not in suggestions:
            suggestions["CLIENT_NAME"] = suggestions["CLIENT"]
        elif "CLIENT_NAME" in suggestions and "CLIENT" not in suggestions:
            suggestions["CLIENT"] = suggestions["CLIENT_NAME"]
            
        return {
            "status": "success",
            "suggestions": suggestions
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
        
        # If project_path is provided, run site data analysis & merge values
        replacements = {**request.replacements}
        if request.project_path:
            try:
                from app.utils.rag_manager import analyze_project_folder
                analysis = analyze_project_folder(request.project_path)
                mappings = {
                    "CLIENT": "client",
                    "CLIENT_NAME": "client",
                    "ADDRESS": "site_address",
                    "SITE_ADDRESS": "site_address",
                    "JOB_NO": "job_no",
                    "BEARING_CAPACITY": "bearing_capacity"
                }
                for placeholder, analysis_key in mappings.items():
                    if not replacements.get(placeholder) and analysis.get(analysis_key):
                        replacements[placeholder] = analysis[analysis_key]
                if not replacements.get("NOTES") and analysis.get("summary"):
                    replacements["NOTES"] = analysis["summary"]
            except Exception as e:
                print(f"Error auto-filling from project_path: {e}")

        initial_state["input_replacements"] = replacements

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


# ----------------------------------------------------
# Advanced RAG & OCR Site Data Analysis Endpoints
# ----------------------------------------------------
from fastapi import BackgroundTasks
from app.utils.rag_manager import build_rag_index, search_rag, analyze_project_folder, REPORTS_DIRS

@router.post("/rag/index/build")
async def trigger_rag_build(background_tasks: BackgroundTasks):
    """Trigger background indexing of all reports in reports directories."""
    background_tasks.add_task(build_rag_index)
    return {"status": "indexing_started", "message": "RAG index build has been scheduled in the background."}

@router.get("/rag/search")
async def rag_search(q: str, limit: int = 5):
    """Query the RAG index database for matched historical report details."""
    try:
        results = search_rag(q, limit)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/projects")
async def list_rag_projects():
    """List all available project folders in 03 - Reports, Reports 2, Reports 3 directories."""
    projects = []
    for base_dir in REPORTS_DIRS:
        if not os.path.exists(base_dir):
            continue
        group_name = os.path.basename(base_dir)
        for item in os.listdir(base_dir):
            item_path = os.path.join(base_dir, item)
            if os.path.isdir(item_path):
                # Count files inside
                files_count = 0
                for r, d, fs in os.walk(item_path):
                    files_count += len(fs)
                
                projects.append({
                    "project_id": item,
                    "folder_path": item_path.replace("\\", "/").replace("\\", "/"),
                    "group": group_name,
                    "files_count": files_count
                })
    return sorted(projects, key=lambda x: (x["group"], x["project_id"]))

@router.get("/rag/analyze")
async def rag_analyze_project(project_path: str):
    """Run analysis and OCR on a specific site project directory to extract key report variables."""
    try:
        if not os.path.exists(project_path):
            raise HTTPException(status_code=404, detail="Project folder not found")
        analysis = analyze_project_folder(project_path)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
