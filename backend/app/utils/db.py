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
    
    # Rock Core Tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rock_projects (
            project_no TEXT PRIMARY KEY,
            client TEXT,
            address TEXT,
            date TEXT,
            logged_by TEXT,
            reviewed_by TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rock_boreholes (
            borehole_id TEXT PRIMARY KEY,
            project_no TEXT,
            surface_rl REAL,
            hole_diameter_mm INTEGER,
            inclination INTEGER,
            drill_bit TEXT,
            drilling_contractor TEXT,
            rig TEXT,
            depth_from REAL,
            depth_to REAL,
            FOREIGN KEY(project_no) REFERENCES rock_projects(project_no) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rock_lithology_units (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borehole_id TEXT,
            depth_from REAL,
            depth_to REAL,
            material TEXT,
            description TEXT,
            weathering TEXT,
            strength TEXT,
            structure TEXT,
            uscs_symbol TEXT,
            status TEXT,
            FOREIGN KEY(borehole_id) REFERENCES rock_boreholes(borehole_id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rock_discontinuities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borehole_id TEXT,
            depth REAL,
            defect_type TEXT,
            angle INTEGER,
            shape TEXT,
            roughness TEXT,
            infilling TEXT,
            aperture REAL,
            condition TEXT,
            notes TEXT,
            status TEXT,
            FOREIGN KEY(borehole_id) REFERENCES rock_boreholes(borehole_id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rock_core_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borehole_id TEXT,
            run_no INTEGER,
            depth_from REAL,
            depth_to REAL,
            tcr REAL,
            rqd REAL,
            fracture_spacing_mm INTEGER,
            status TEXT,
            FOREIGN KEY(borehole_id) REFERENCES rock_boreholes(borehole_id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()
    print(f"Local SQLite database initialized with soil and rock tables at {SQLITE_PATH}")

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


# ==========================================
# ROCK CORE LOGGING HELPERS
# ==========================================

def save_rock_borehole_data(project: dict, borehole: dict, lithologies: list[dict], discontinuities: list[dict], core_runs: list[dict]):
    init_db()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
        # Upsert project
        project_no = project.get("project_no") or project.get("projectNumber") or ""
        cursor.execute(
            """
            INSERT OR REPLACE INTO rock_projects (project_no, client, address, date, logged_by, reviewed_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                project_no,
                project.get("client", ""),
                project.get("address", ""),
                project.get("date", ""),
                project.get("logged_by", ""),
                project.get("reviewed_by", "")
            )
        )
        
        # Upsert borehole
        borehole_id = borehole.get("borehole_id") or borehole.get("boreholeId") or ""
        cursor.execute(
            """
            INSERT OR REPLACE INTO rock_boreholes (
                borehole_id, project_no, surface_rl, hole_diameter_mm, inclination, 
                drill_bit, drilling_contractor, rig, depth_from, depth_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                borehole_id,
                project_no,
                borehole.get("surface_rl"),
                borehole.get("hole_diameter_mm"),
                borehole.get("inclination", 90),
                borehole.get("drill_bit", ""),
                borehole.get("drilling_contractor", ""),
                borehole.get("rig", ""),
                borehole.get("depth_from"),
                borehole.get("depth_to")
            )
        )
        
        # Clear existing tables for this borehole
        cursor.execute("DELETE FROM rock_lithology_units WHERE borehole_id = ?", (borehole_id,))
        cursor.execute("DELETE FROM rock_discontinuities WHERE borehole_id = ?", (borehole_id,))
        cursor.execute("DELETE FROM rock_core_runs WHERE borehole_id = ?", (borehole_id,))
        
        # Insert lithologies
        for l in lithologies:
            cursor.execute(
                """
                INSERT INTO rock_lithology_units (
                    borehole_id, depth_from, depth_to, material, description, 
                    weathering, strength, structure, uscs_symbol, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    borehole_id,
                    l.get("depth_from") if l.get("depth_from") is not None else l.get("from"),
                    l.get("depth_to") if l.get("depth_to") is not None else l.get("to"),
                    l.get("material", ""),
                    l.get("description", ""),
                    l.get("weathering", ""),
                    l.get("strength", ""),
                    l.get("structure", ""),
                    l.get("uscs_symbol", "") or l.get("uscs_code", ""),
                    l.get("status", "draft")
                )
            )
            
        # Insert discontinuities
        for d in discontinuities:
            cursor.execute(
                """
                INSERT INTO rock_discontinuities (
                    borehole_id, depth, defect_type, angle, shape, 
                    roughness, infilling, aperture, condition, notes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    borehole_id,
                    d.get("depth"),
                    d.get("defect_type") or d.get("type", ""),
                    d.get("angle"),
                    d.get("shape", ""),
                    d.get("roughness", ""),
                    d.get("infilling", ""),
                    d.get("aperture"),
                    d.get("condition", ""),
                    d.get("notes", ""),
                    d.get("status", "draft")
                )
            )
            
        # Insert core runs
        for r in core_runs:
            cursor.execute(
                """
                INSERT INTO rock_core_runs (
                    borehole_id, run_no, depth_from, depth_to, tcr, rqd, fracture_spacing_mm, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    borehole_id,
                    r.get("run_no") or r.get("runIndex") or 1,
                    r.get("depth_from") if r.get("depth_from") is not None else r.get("depthFromM"),
                    r.get("depth_to") if r.get("depth_to") is not None else r.get("depthToM"),
                    r.get("tcr") if r.get("tcr") is not None else r.get("tcrPercent"),
                    r.get("rqd") if r.get("rqd") is not None else r.get("rqdPercent"),
                    r.get("fracture_spacing_mm") or r.get("dominantJointSpacingMm"),
                    r.get("status", "draft")
                )
            )
        conn.commit()
        print(f"Successfully saved rock core borehole data for {borehole_id}")
    except Exception as e:
        print(f"SQLite rock save error: {e}")
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_rock_borehole_data(borehole_id: str) -> dict | None:
    init_db()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
        # Get borehole
        cursor.execute("SELECT * FROM rock_boreholes WHERE borehole_id = ?", (borehole_id,))
        bh_row = cursor.fetchone()
        if not bh_row:
            return None
        bh = dict(bh_row)
        
        # Get project
        cursor.execute("SELECT * FROM rock_projects WHERE project_no = ?", (bh["project_no"],))
        proj_row = cursor.fetchone()
        proj = dict(proj_row) if proj_row else {}
        
        # Get lithology
        cursor.execute("SELECT * FROM rock_lithology_units WHERE borehole_id = ? ORDER BY depth_from ASC", (borehole_id,))
        lithologies = [dict(r) for r in cursor.fetchall()]
        # map depth_from/to to from/to for compatibility
        for l in lithologies:
            l["from"] = l["depth_from"]
            l["to"] = l["depth_to"]
            
        # Get discontinuities
        cursor.execute("SELECT * FROM rock_discontinuities WHERE borehole_id = ? ORDER BY depth ASC", (borehole_id,))
        disconts = [dict(r) for r in cursor.fetchall()]
        
        # Get core runs
        cursor.execute("SELECT * FROM rock_core_runs WHERE borehole_id = ? ORDER BY run_no ASC", (borehole_id,))
        runs = [dict(r) for r in cursor.fetchall()]
        # map depth_from/to to depthFromM/depthToM for compatibility
        for r in runs:
            r["depthFromM"] = r["depth_from"]
            r["depthToM"] = r["depth_to"]
            r["tcrPercent"] = r["tcr"]
            r["rqdPercent"] = r["rqd"]
            r["dominantJointSpacingMm"] = r["fracture_spacing_mm"]
            
        return {
            "project": {
                "project_no": proj.get("project_no", ""),
                "projectNumber": proj.get("project_no", ""),
                "client": proj.get("client", ""),
                "address": proj.get("address", ""),
                "date": proj.get("date", ""),
                "logged_by": proj.get("logged_by", ""),
                "reviewed_by": proj.get("reviewed_by", "")
            },
            "borehole": bh,
            "lithology_units": lithologies,
            "discontinuities": disconts,
            "core_runs": runs,
            "review": {
                "status": "approved" if all(l.get("status") == "approved" for l in lithologies) and lithologies else "draft",
                "approved_by": proj.get("reviewed_by", ""),
                "approved_at": ""
            }
        }
    except Exception as e:
        print(f"SQLite rock read error: {e}")
        return None
    finally:
        conn.close()

def list_rock_boreholes() -> list[dict]:
    init_db()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT rb.borehole_id, rb.project_no, rp.client, rb.depth_from, rb.depth_to
            FROM rock_boreholes rb
            LEFT JOIN rock_projects rp ON rb.project_no = rp.project_no
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"SQLite list error: {e}")
        return []
    finally:
        conn.close()
