import json
from pathlib import Path
from typing import Dict, Any, Optional
from app.models import AutoSoilDataModel

DB_DIR = Path("database")

def get_project_db_path(project_id: str) -> Path:
    return DB_DIR / f"{project_id}.json"

def ensure_db_dir():
    DB_DIR.mkdir(parents=True, exist_ok=True)

def load_project(project_id: str) -> AutoSoilDataModel:
    ensure_db_dir()
    db_path = get_project_db_path(project_id)
    if not db_path.exists():
        # Return empty default model
        return AutoSoilDataModel()
    
    with open(db_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return AutoSoilDataModel(**data)

def save_project(project_id: str, data: AutoSoilDataModel) -> None:
    ensure_db_dir()
    db_path = get_project_db_path(project_id)
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(data.dict(by_alias=True), f, indent=2, ensure_ascii=False)
