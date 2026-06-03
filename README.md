# AutoSoil Logger - Computer Vision Pipeline

This project processes core box photography to generate OpenGround-compatible PDF borehole logs with AI-drafted geology descriptions.

## Pipeline Architecture
The system integrates an automated sequence of operations that mimics an engineering geology workflow:

1. **Upload & Preprocess**: Fix perspective, scaling, and rotation of the core box photograph.
2. **Tray Row Detection**: Identifies individual core box rows.
3. **Depth Scale Calibration**: Extracts start/end depth (e.g. 9.0m to 14.0m) and calculates pixel-to-meter scales for each row.
4. **Core Piece Segmentation**: Identifies intact core blocks vs. rubble/broken zones.
5. **Defect Markup**: Automatically identifies joints, fractures, and clay seams along with their apparent dip angles.
6. **Geotechnical Metrics (TCR/RQD)**: Calculates Total Core Recovery and Rock Quality Designation per run.
7. **AI Geology Draft (DeepSeek)**: Drafts AS1726 logging descriptions based on the visual metrics.
8. **Human Review**: A specialized logging UI that mandates approval before PDF export.
9. **OpenGround PDF Export**: Generates professional PDF outputs matching Bentley OpenGround's default templates.

## Running Locally

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

*Note: Ensure `DEEPSEEK_API_KEY` is provided in the `backend/.env` file to enable actual AI draft generation.*
