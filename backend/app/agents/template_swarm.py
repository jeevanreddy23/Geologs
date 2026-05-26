# app/agents/template_swarm.py

import os
import json
import re
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.utils.template_manager import extract_placeholders, extract_variables_from_docx, fill_template

class TemplateSwarmState(TypedDict):
    # Inputs
    template_id: str
    template_path: str
    selected_historical_report_path: Optional[str]
    input_replacements: Dict[str, str] # Pre-filled or user overrides
    
    # Swarm States
    placeholders: List[str]
    replacements: Dict[str, str] # Accumulated final replacements
    compliance_check: str
    qa_score: float # 0 to 100
    qa_passed: bool
    qa_feedback: List[str]
    output_path: Optional[str]
    dispatch_status: str
    messages: Annotated[list, add_messages]
    last_agent: str
    error: Optional[str]


# ----------------------------------------------------
# 1. Classifier Agent Node
# ----------------------------------------------------
async def swarm_classifier_agent(state: TemplateSwarmState) -> dict:
    """Classifier Agent: Scans dynamic variable placeholders and analyzes style context."""
    template_path = state.get("template_path")
    if not template_path or not os.path.exists(template_path):
        return {
            "error": f"Classifier Agent Error: Template path '{template_path}' not found.",
            "last_agent": "ClassifierAgent"
        }
        
    print(f"[Classifier Agent] Scanning template: {os.path.basename(template_path)}")
    placeholders = extract_placeholders(template_path)
    
    # Ensure global core fields are always in placeholders
    core_fields = ["CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER", "BEARING_CAPACITY"]
    for cf in core_fields:
        if cf not in placeholders:
            placeholders.append(cf)
            
    classification_notes = f"Parsed template {os.path.basename(template_path)}. Found {len(placeholders)} variable slots."
    print(f"[Classifier Agent] Scanned slots: {placeholders}")
    
    # Start with input user replacements
    replacements = {p: "" for p in placeholders}
    for k, v in state.get("input_replacements", {}).items():
        if k in replacements:
            replacements[k] = v

    return {
        "placeholders": placeholders,
        "replacements": replacements,
        "messages": [HumanMessage(content=classification_notes)],
        "last_agent": "ClassifierAgent"
    }


# ----------------------------------------------------
# 2. Historical Agent Node
# ----------------------------------------------------

# ----------------------------------------------------
# ColBERT Value Extraction Helpers
# ----------------------------------------------------

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None


def extract_field_value_from_chunk(placeholder: str, chunk_text: str) -> Optional[str]:
    """Offline/regex-based extraction of field values from a text chunk."""
    import re
    text_lower = chunk_text.lower()
    
    if placeholder in ["CLIENT", "CLIENT_NAME"]:
        matches = re.findall(r'(?:client|commissioned by|prepared for)\\s*[:\\-]\\s*([^\\n|]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
        for line in chunk_text.split("\\n"):
            if "client" in line.lower() or "prepared for" in line.lower():
                cleaned = re.sub(r'(?:client|prepared for)\\s*[:\\-]?\\s*', '', line, flags=re.IGNORECASE)
                return cleaned.strip()
                
    elif placeholder in ["ADDRESS", "SITE_ADDRESS"]:
        matches = re.findall(r'(?:site address|address|location|project site)\\s*[:\\-]\\s*([^\\n|]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
            
    elif placeholder == "BEARING_CAPACITY":
        matches = re.findall(r'(?:bearing\\s+pressure|bearing\\s+capacity|allowable\\s+bearing)\\s+of\\s+(\\d+\\s*(?:kpa|mpa|kn))', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
        matches = re.findall(r'(?:bearing\\s+pressure|bearing\\s+capacity|allowable\\s+bearing)\\s*[:\\-]\\s*([^\\n|]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
            
    elif placeholder == "JOB_NO":
        matches = re.findall(r'(?:job\\s+no|job\\s+number|project\\s+no|ref)\\s*[:\\-]\\s*([a-z0-9\\-\\/\\s]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
            
    elif placeholder == "REPORT_NO":
        matches = re.findall(r'(?:report\\s+no|report\\s+number)\\s*[:\\-]\\s*([a-z0-9\\-\\/\\s]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()

    elif placeholder == "DATE":
        matches = re.findall(r'(?:date)\\s*[:\\-]\\s*([^\\n|]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()

    elif placeholder == "ENGINEER":
        matches = re.findall(r'(?:engineer|author|prepared by)\\s*[:\\-]\\s*([^\\n|]+)', chunk_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()

    # Fallback: return line containing keyword if found
    kw = placeholder.replace("_", " ").lower()
    idx = text_lower.find(kw)
    if idx != -1:
        lines = chunk_text.split("\\n")
        for line in lines:
            if kw in line.lower():
                cleaned = line.strip()
                cleaned = re.sub(r'^.*?' + re.escape(kw) + r'\\s*[:\\-]?\\s*', '', cleaned, flags=re.IGNORECASE)
                if cleaned:
                    return cleaned
        start = max(0, idx)
        end = min(len(chunk_text), idx + 100)
        return chunk_text[start:end].strip()
        
    return None


async def extract_value_via_llm(placeholder: str, chunk_text: str) -> Optional[str]:
    """Extract field values using ChatOpenAI/ChatAnthropic if not in mock mode."""
    provider = os.getenv("MODEL_PROVIDER", "openai")
    if provider == "mock":
        return None
    try:
        if provider == "anthropic" and ChatAnthropic is not None:
            llm = ChatAnthropic(model=os.getenv("MODEL_NAME", "claude-opus-4-6"))
        else:
            llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o"))
            
        system_prompt = (
            "You are a precise data extraction assistant. Given a text chunk from a geotechnical report, "
            f"extract the specific value for the field '{placeholder}'.\\n"
            "Return ONLY the extracted value. Do not write any other explanation or intro."
        )
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Text Chunk:\\n{chunk_text}")
        ])
        val = response.content.strip()
        if val and "not found" not in val.lower() and "n/a" not in val.lower():
            return val
    except Exception as e:
        print(f"[Historical Agent] LLM value extraction failed for {placeholder}: {e}")
    return None


async def swarm_historical_agent(state: TemplateSwarmState) -> dict:
    """Historical Agent: Semantic lookup & extraction from previous reports to achieve smart auto-fill using ColBERT."""
    replacements = state.get("replacements") or {}
    hist_path = state.get("selected_historical_report_path")
    
    # Step A: Run build_index_from_reports over text extractions of reports 1, 2, 3
    from app.utils.rag_manager import build_index_from_reports, search_rag_late_interaction
    print("[Historical Agent] Initializing ColBERT index over reports 1, 2, 3...", flush=True)
    build_index_from_reports(limit=15)
    
    updated_replacements = {**replacements}
    filled_count = 0
    colbert_hits = 0
    
    # If a hist_path is provided, we can first extract metadata using regex parser as a base
    if hist_path and os.path.exists(hist_path):
        print(f"[Historical Agent] Running base docx regex parser on: {os.path.basename(hist_path)}", flush=True)
        extracted_data = extract_variables_from_docx(hist_path)
        for k, v in extracted_data.items():
            if k in updated_replacements and not updated_replacements[k] and v:
                updated_replacements[k] = v
                filled_count += 1
                
    # Step B: Send targeted keyword requests straight to the ColBERT index for remaining blank fields
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
    
    for key, current_val in list(updated_replacements.items()):
        if not current_val:  # Field is empty, let's find it via ColBERT
            query_term = QUERY_MAPPINGS.get(key, key.replace("_", " ").title())
            print(f"[Historical Agent] Querying ColBERT index for key '{key}' with term: '{query_term}'...", flush=True)
            
            # Query ColBERT index. Filter by hist_path if specified.
            results = search_rag_late_interaction(query_term, limit=10, file_path=hist_path)
            
            if results:
                # Get the highest scoring chunk
                top_chunk = results[0]
                chunk_text = top_chunk["chunk_text"]
                score = top_chunk["score"]
                print(f"[Historical Agent] Match found in {top_chunk['file_name']} (score {score:.4f}): {chunk_text[:120]}...", flush=True)
                
                # Step C: Extract and pre-fill field value
                extracted_val = await extract_value_via_llm(key, chunk_text)
                if not extracted_val:
                    extracted_val = extract_field_value_from_chunk(key, chunk_text)
                    
                if extracted_val:
                    updated_replacements[key] = extracted_val
                    colbert_hits += 1
                    print(f"[Historical Agent] Extracted value for '{key}': '{extracted_val}'", flush=True)
                else:
                    # Fall back to using the first line of the matching chunk as default
                    fallback_val = chunk_text.split("\\n")[0][:150].strip()
                    updated_replacements[key] = fallback_val
                    colbert_hits += 1
                    print(f"[Historical Agent] Extracted fallback value for '{key}': '{fallback_val}'", flush=True)

    # Cross-fill common equivalents if one is filled and another is not
    if "CLIENT" in updated_replacements and not updated_replacements["CLIENT"] and updated_replacements.get("CLIENT_NAME"):
        updated_replacements["CLIENT"] = updated_replacements["CLIENT_NAME"]
    if "CLIENT_NAME" in updated_replacements and not updated_replacements["CLIENT_NAME"] and updated_replacements.get("CLIENT"):
        updated_replacements["CLIENT_NAME"] = updated_replacements["CLIENT"]
    if "SITE_ADDRESS" in updated_replacements and not updated_replacements["SITE_ADDRESS"] and updated_replacements.get("ADDRESS"):
        updated_replacements["SITE_ADDRESS"] = updated_replacements["ADDRESS"]
    if "ADDRESS" in updated_replacements and not updated_replacements["ADDRESS"] and updated_replacements.get("SITE_ADDRESS"):
        updated_replacements["ADDRESS"] = updated_replacements["SITE_ADDRESS"]

    msg = f"Historical Agent auto-populated {filled_count} fields via docx parser and {colbert_hits} fields via ColBERT Late Interaction RAG."
    print(f"[Historical Agent] Completed match: {msg}", flush=True)
    
    return {
        "replacements": updated_replacements,
        "messages": [HumanMessage(content=msg)],
        "last_agent": "HistoricalAgent"
    }


# ----------------------------------------------------
# 3. Compliance Agent Node
# ----------------------------------------------------
async def swarm_compliance_agent(state: TemplateSwarmState) -> dict:
    """Compliance Agent: Validates standard AS 1726 rules, project numbers, and standard formats."""
    replacements = state.get("replacements") or {}
    feedback = []
    
    print("[Compliance Agent] Verifying geotechnical standards AS 1726 compliance...")
    
    # 1. Check client & address
    if not replacements.get("CLIENT") and not replacements.get("CLIENT_NAME"):
        feedback.append("AS 1726 Compliance alert: Client name must be defined for project tracking.")
    if not replacements.get("SITE_ADDRESS") and not replacements.get("ADDRESS"):
        feedback.append("AS 1726 Compliance alert: Project site location/address must be specified.")
        
    # 2. Check Job / Report Number format
    job_no = replacements.get("JOB_NO", "")
    if job_no:
        if not re.match(r'^[A-Z0-9\-\/\s]{3,20}$', job_no, re.IGNORECASE):
            feedback.append(f"Format alert: JOB_NO '{job_no}' does not conform to standard company project codes.")
            
    # 3. Check bearing capacity
    bearing = replacements.get("BEARING_CAPACITY", "")
    if bearing and not any(unit in bearing.lower() for unit in ["kpa", "mpa", "kn"]):
        feedback.append("Engineering warning: BEARING_CAPACITY field does not declare structural unit metrics (kPa/MPa).")
        
    compliance_summary = "Compliance PASS" if not feedback else f"Compliance checks raised {len(feedback)} warnings."
    print(f"[Compliance Agent] Check result: {compliance_summary}")
    
    return {
        "compliance_check": compliance_summary,
        "qa_feedback": feedback,
        "messages": [HumanMessage(content=f"Compliance check completed. Warnings found: {len(feedback)}")],
        "last_agent": "ComplianceAgent"
    }


# ----------------------------------------------------
# 4. QA Scoring Agent Node
# ----------------------------------------------------
async def swarm_qa_scoring_agent(state: TemplateSwarmState) -> dict:
    """QA Scoring Agent: Applies quantitative scoring metrics to replacements mapping."""
    replacements = state.get("replacements") or {}
    placeholders = state.get("placeholders") or []
    compliance_warnings = state.get("qa_feedback") or []
    
    print("[QA Scoring Agent] Commencing final quality checks...")
    
    # Checklist weights:
    # - Global keys completeness: 40%
    # - Custom template placeholders completed: 40%
    # - AS 1726 warnings absence: 20%
    
    global_keys = ["CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER"]
    global_filled = sum(1 for gk in global_keys if gk in replacements and replacements[gk])
    global_score = (global_filled / len(global_keys)) * 40
    
    custom_placeholders = [p for p in placeholders if p not in global_keys]
    if custom_placeholders:
        custom_filled = sum(1 for cp in custom_placeholders if cp in replacements and replacements[cp])
        custom_score = (custom_filled / len(custom_placeholders)) * 40
    else:
        custom_score = 40.0 # Free pass if no custom slots
        
    compliance_score = max(0.0, 20.0 - (len(compliance_warnings) * 5.0))
    
    total_score = global_score + custom_score + compliance_score
    passed = total_score >= 90.0
    
    print(f"[QA Scoring Agent] Score: {total_score:.1f}% (Passed: {passed})")
    
    return {
        "qa_score": round(total_score, 1),
        "qa_passed": passed,
        "messages": [HumanMessage(content=f"QA Evaluator issued quality index: {total_score:.1f}%")],
        "last_agent": "QAScoringAgent"
    }


# ----------------------------------------------------
# 5. Report Compilation Agent Node
# ----------------------------------------------------
async def swarm_report_compilation_agent(state: TemplateSwarmState) -> dict:
    """Report Compilation Agent: Integrates values into original Word Template while preserving style rules."""
    template_path = state.get("template_path")
    replacements = state.get("replacements") or {}
    
    print(f"[Report Compilation Agent] Merging parameters into layout stream...")
    
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(template_path))), "Generated Reports")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    file_name = f"Generated_{os.path.basename(template_path)}"
    output_path = os.path.join(output_dir, file_name)
    
    try:
        completed_path = fill_template(template_path, replacements, output_path)
        print(f"[Report Compilation Agent] Document generated at: {completed_path}")
        return {
            "output_path": completed_path,
            "messages": [HumanMessage(content=f"Successfully built document mapping at '{completed_path}'.")],
            "last_agent": "ReportCompilationAgent"
        }
    except Exception as e:
        print(f"[Report Compilation Agent] Error during template instantiation: {e}")
        return {
            "error": f"Compilation Agent failed: {str(e)}",
            "last_agent": "ReportCompilationAgent"
        }


# ----------------------------------------------------
# 6. Dispatch Agent Node
# ----------------------------------------------------
async def swarm_dispatch_agent(state: TemplateSwarmState) -> dict:
    """Dispatch Agent: Completes log registry, registers execution success, and completes download route."""
    output_path = state.get("output_path")
    
    if output_path and os.path.exists(output_path):
        status = f"Report successfully dispatched. Output located at {output_path} (Size: {os.path.getsize(output_path)} bytes)."
    else:
        status = "Dispatch Warning: Incomplete workflow or output file not compiled."
        
    print(f"[Dispatch Agent] Completed: {status}")
    
    return {
        "dispatch_status": status,
        "messages": [HumanMessage(content="Orchestrator successfully terminated. Document dispatched to dashboard download stream.")],
        "last_agent": "DispatchAgent"
    }


# ----------------------------------------------------
# Swarm DAG Workflow Graph Builder
# ----------------------------------------------------
def build_template_swarm_graph():
    builder = StateGraph(TemplateSwarmState)
    
    # Register Nodes
    builder.add_node("ClassifierAgent", swarm_classifier_agent)
    builder.add_node("HistoricalAgent", swarm_historical_agent)
    builder.add_node("ComplianceAgent", swarm_compliance_agent)
    builder.add_node("QAScoringAgent", swarm_qa_scoring_agent)
    builder.add_node("ReportCompilationAgent", swarm_report_compilation_agent)
    builder.add_node("DispatchAgent", swarm_dispatch_agent)
    
    # Establish sequential flow DAG
    builder.add_edge(START, "ClassifierAgent")
    builder.add_edge("ClassifierAgent", "HistoricalAgent")
    builder.add_edge("HistoricalAgent", "ComplianceAgent")
    builder.add_edge("ComplianceAgent", "QAScoringAgent")
    builder.add_edge("QAScoringAgent", "ReportCompilationAgent")
    builder.add_edge("ReportCompilationAgent", "DispatchAgent")
    builder.add_edge("DispatchAgent", END)
    
    return builder.compile()

# Compile default swarm orchestrator instance
template_swarm = build_template_swarm_graph()
