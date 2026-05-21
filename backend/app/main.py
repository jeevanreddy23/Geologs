# app/main.py

import os
from dotenv import load_dotenv
load_dotenv()

# Patch for langchain attribute error
try:
    import langchain
    if not hasattr(langchain, "debug"):
        langchain.debug = False
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.api.routes import router
from app.utils.db import init_db
init_db()

app = FastAPI(title="AutoSoil Logger API v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Relaxed for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Mount the redesigned Intelligent Workflow UI at the root
ui_path = os.path.join(os.path.dirname(__file__), "..", "..", "workflow_ui")
if os.path.exists(ui_path):
    app.mount("/workflow", StaticFiles(directory=ui_path, html=True), name="workflow")
    
    @app.get("/")
    async def root():
        return RedirectResponse(url="/workflow")
else:
    @app.get("/")
    async def root():
        return {"message": "AutoSoil API is running. Redesigned UI not found in workflow_ui folder."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
