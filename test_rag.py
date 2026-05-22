# test_rag.py
import sys
import os
sys.path.append(os.path.abspath("backend"))

from backend.app.utils.rag_manager import build_rag_index, search_rag, analyze_project_folder

if __name__ == "__main__":
    print("Initializing test...")
    # Test RAG build (first 1 or 2 files to check speed/correctness)
    # We will build RAG index
    build_rag_index(limit=3)
    
    print("\nTesting Search...")
    results = search_rag("allowable bearing capacity")
    print(f"Search found {len(results)} results.")
    for r in results[:3]:
        print(f"- {r['file_name']} in {r['group_name']}: Score={r['score']}")
        print(f"  Snippet: {r['snippet']}")
        
    print("\nTesting Folder Analysis...")
    # Analyze a small folder that we know exists
    folder = r"C:\Users\pored\Downloads\Project Geologs\03 - Reports\1105E-G"
    analysis = analyze_project_folder(folder)
    print(f"Folder Analysis Complete: {analysis['summary']}")
    print(f"Photos found: {len(analysis['photos'])}")
    print(f"DCP forms found: {len(analysis['dcp_forms'])}")
    print(f"Soil logs found: {len(analysis['soil_logs'])}")
