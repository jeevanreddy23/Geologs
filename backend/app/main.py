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

# Origins are an explicit allowlist from ALLOWED_ORIGINS (comma-separated).
# Credentials are disabled: the API authenticates via the X-Autosoil-Api-Key
# header, not cookies, so wildcard-with-credentials (a CSRF hole) is unnecessary.
_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Autosoil-Api-Key"],
)

app.include_router(router)

# Mount the frontend built React files at the root
ui_path = os.path.join(os.path.dirname(__file__), "..", "frontend_dist")
if os.path.exists(ui_path):
    app.mount("/", StaticFiles(directory=ui_path, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "AutoSoil API is running. Frontend build not found at " + ui_path}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
