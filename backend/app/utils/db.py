import os
import sqlite3
from typing import Optional
import httpx

SQLITE_PATH = os.getenv("AUTOSOIL_SQLITE_PATH", "data.db")
if os.name != 'nt' and (':' in SQLITE_PATH or '\\' in SQLITE_PATH):
    SQLITE_PATH = "data.db"
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

def get_sqlite_conn():
    dir_name = os.path.dirname(SQLITE_PATH)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS boreholes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            project_name TEXT NOT NULL,
            borehole_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS soil_layers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borehole_id TEXT NOT NULL,
            depth_from REAL NOT NULL,
            depth_to REAL NOT NULL,
            uscs_code TEXT NOT NULL,
            description TEXT,
            colour TEXT,
            moisture TEXT,
            consistency TEXT,
            structure TEXT,
            inclusions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borehole_id) REFERENCES boreholes (id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()
    print(f"Local SQLite database initialized at {SQLITE_PATH}")

def save_layer(project_id: str, project_name: str, borehole_id: str, layer: dict):
    init_db()
    bh_id = f"{project_id}-{borehole_id}"
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO boreholes (id, project_id, project_name, borehole_id) VALUES (?, ?, ?, ?)",
            (bh_id, project_id, project_name, borehole_id)
        )
        cursor.execute(
            '''
            INSERT INTO soil_layers 
            (borehole_id, depth_from, depth_to, uscs_code, description, colour, moisture, consistency, structure, inclusions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                bh_id,
                layer.get("depth_from", 0.0),
                layer.get("depth_to", 0.0),
                layer.get("uscs_code", ""),
                layer.get("description", ""),
                layer.get("colour", ""),
                layer.get("moisture", ""),
                layer.get("consistency", ""),
                layer.get("structure", ""),
                layer.get("inclusions", "")
            )
        )
        conn.commit()
        print(f"Successfully saved layer to SQLite for borehole {bh_id}")
    except Exception as e:
        print(f"SQLite error: {e}")
    finally:
        conn.close()

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            # 1. Upsert borehole to Supabase via PostgREST
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            bh_payload = {
                "id": bh_id,
                "project_id": project_id,
                "project_name": project_name,
                "borehole_id": borehole_id
            }
            url_bh = f"{SUPABASE_URL.rstrip('/')}/rest/v1/boreholes"
            res_bh = httpx.post(url_bh, headers=headers, json=bh_payload, timeout=10.0)
            if res_bh.status_code not in (200, 201, 204):
                print(f"Supabase boreholes upsert failed with status {res_bh.status_code}: {res_bh.text}")
            else:
                print(f"Successfully synchronized borehole to Supabase: {bh_id}")

            # 2. Insert soil layer to Supabase via PostgREST
            layer_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            layer_payload = {
                "borehole_id": bh_id,
                "depth_from": float(layer.get("depth_from", 0.0)),
                "depth_to": float(layer.get("depth_to", 0.0)),
                "uscs_code": layer.get("uscs_code", ""),
                "description": layer.get("description", ""),
                "colour": layer.get("colour", ""),
                "moisture": layer.get("moisture", ""),
                "consistency": layer.get("consistency", ""),
                "structure": layer.get("structure", ""),
                "inclusions": layer.get("inclusions", "")
            }
            url_layer = f"{SUPABASE_URL.rstrip('/')}/rest/v1/soil_layers"
            res_layer = httpx.post(url_layer, headers=layer_headers, json=layer_payload, timeout=10.0)
            if res_layer.status_code not in (200, 201, 204):
                print(f"Supabase soil_layers insert failed with status {res_layer.status_code}: {res_layer.text}")
            else:
                print(f"Successfully synchronized layer to Supabase for borehole {bh_id}")
        except Exception as e:
            print(f"Supabase synchronization failed with exception: {e}")
    else:
        print("Supabase credentials not configured. Skipping remote database synchronization.")
