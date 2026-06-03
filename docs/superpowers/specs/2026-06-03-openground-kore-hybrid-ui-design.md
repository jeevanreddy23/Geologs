# AutoSoil Logger OpenGround x KORE Hybrid UI Design

## Objective

Transform AutoSoil Logger into a professional geotechnical production workspace that combines OpenGround-style structured data management with KORE-style image-first core logging. The first screen must be a working production cockpit, not a marketing page or chatbot interface.

The protected gINT/OpenGround-style borehole logging and PDF rendering subsystem must remain intact. This design builds a UI shell and review workflow around that renderer without changing its depth scale, hatch rendering, typography, graphical columns, spacing, AS1726 formatting, or export behavior.

## Product Principle

AutoSoil Logger should feel like image-first geotechnical drafting acceleration for Australian engineers. It should support:

- Project and borehole selection.
- Core tray, DCP, borehole sheet, field note, site photo, drawing, PDF, and report uploads.
- OCR and vision extraction with visible confidence.
- Dense geotechnical grid editing.
- Human review of every AI-generated critical field.
- Live gINT/OpenGround-style log preview.
- QA validation before export.
- PDF, DOCX, Excel, JSON, and report package outputs.

It must not feel like a generic SaaS dashboard, toy AI app, chatbot, dark glassmorphism UI, or marketing landing page.

## Protected Core Boundary

The existing borehole log renderer is a protected subsystem. The UI may embed, refresh, or route data into it, but must not alter:

- Borehole layout geometry.
- Depth and RL formatting.
- Lithology graphic and hatch drawing.
- Graphical log spacing.
- Sample, SPT, DCP, RQD, and groundwater marker rendering.
- PDF scaling and pagination behavior.
- AS1726 material description formatting.

Any future renderer changes require a separate explicit approval and test plan.

## Personas

The workspace must support these users:

- Field geologist logging observations from photos and field sheets.
- Engineering geologist reviewing lithology, weathering, strength, defects, RQD, and TCR.
- Geotechnical engineer reviewing recommendations and report wording.
- Report compiler preparing STS-style DOCX/PDF deliverables.
- Project manager checking export readiness.
- Admin/template manager maintaining templates and previous-report memory.

## Top-Level Layout

The app uses one persistent six-zone workspace:

1. Top Product Bar.
2. Left Project Explorer.
3. Center Working Area.
4. Right Inspector / Review Panel.
5. Bottom Validation and Activity Stream.
6. Floating or sticky Export / Quick Log controls.

The layout should be responsive, but desktop is the primary professional workflow. Mobile should preserve access to review and upload workflows without overlapping text or panels.

## Visual Direction

Use a professional light engineering theme inspired by KORE and OpenGround workflows without cloning either UI:

- Background: `#eef5f8`, `#f6fafb`, white.
- Primary ink: `#0a2436`.
- Secondary text: `#587086`.
- Navy: `#004d71`.
- Teal: `#0078a8`.
- Approval green: `#0a8f6d`.
- Warning amber: `#c58312`.
- Error red: `#b83232`.
- Grid borders: `rgba(10,36,54,0.12)`.

Typography must be compact and technical. Use monospace only for depths, IDs, coordinates, codes, and measured values. Avoid oversized hero text inside the application workspace.

## Top Product Bar

The top bar contains:

- AutoSoil Logger logo.
- Subtitle: `Image-first geotechnical logging`.
- Project/cloud indicator.
- Active standard: `AS 1726:2017`.
- Global search.
- Project selector.
- Borehole/location selector.
- Workflow tabs: `Explorer`, `Core Photos`, `Borehole Grid`, `DCP`, `Reports`, `QA`, `Outputs`.
- Sync status.
- Review status.
- Export button.
- Settings.
- User/profile.

The bar should remain compact and support rapid navigation between project, borehole, and workflow modes.

## Left Project Explorer

The explorer is an OpenGround-style project tree:

- Cloud / Workspace.
- Project.
- Locations: `BH-01`, `BH-02`, `TP-01`, `DCP-01`.
- Data: Geology, Samples, SPT, DCP, Core Runs, Defects, Groundwater, Photos, Lab, Attachments.
- Reports: Borehole Logs, Core Logs, Site Classification, Investigation Report, Previous Reports.
- Templates: STS templates, OpenGround-style logs, DOCX templates.

Explorer behaviors:

- Collapsible sections.
- Count badges.
- Warning badges for incomplete data.
- Search/filter.
- Context menus for actions.
- Drag uploaded files into locations.
- Clear selected-location highlight.

## Center Working Area

The center area changes by workflow tab.

### Core Photos

This is the KORE-style image-first workspace.

Required elements:

- Large core tray image viewer.
- Upload queue.
- Zoom, pan, rotate, crop, perspective correction controls.
- Brightness/contrast controls.
- Depth ruler and calibration status.
- Tray boundary overlay.
- Row/depth calibration overlay.
- Core piece overlay.
- Fracture/defect markup overlay.
- Broken core, void, core loss, and sample interval overlays.
- Row selector.
- AI detected zones.
- Click-to-edit intervals.
- Detected interval table below the viewer.

Required actions:

- Upload.
- Crop.
- Rotate.
- Perspective correct.
- Detect rows.
- Calibrate depth.
- Detect pieces.
- Detect fractures.
- Calculate RQD/TCR.
- Generate draft lithology.
- Approve values.

The UI must show detected row confidence, calibration state, measurement source, and review requirement. If scale or depth calibration is insufficient, exact dimensions, RQD, and TCR must remain null or review-required.

### Borehole Grid

This is the OpenGround-style data entry workspace.

Grid groups:

- Location Details.
- Lithology.
- Samples.
- SPT.
- DCP.
- Core Runs.
- Discontinuities.
- Weathering.
- Strength.
- Groundwater.
- Remarks.
- Attachments.

Grid behaviors:

- Sticky headers.
- Compact editable cells.
- Keyboard editing.
- Copy/paste rows.
- Add/delete row.
- Calculated fields.
- Validation warnings per cell.
- AI confidence markers.
- Yellow highlight for changed or inferred fields.
- Approved rows can be locked.

### Reports

This view embeds the protected gINT/OpenGround-style preview.

Preview requirements:

- A4 portrait canvas.
- Repeat header.
- Depth scale.
- RL column.
- Lithology graphic column.
- Sample/test column.
- Recovery/RQD column.
- Defects column.
- Material description column.
- Groundwater markers.
- SPT/DCP markers.
- Footer legend.
- Sheet numbering.

Controls around the preview:

- Quick Log.
- Full PDF.
- DOCX Report.
- Export Excel.
- Export JSON.
- Print.
- Compare with previous report.

Warnings must appear outside the report canvas and must not be included in final issue PDF output.

### DCP

The DCP workflow keeps a dense geotechnical table and graph:

- Depth.
- Blows.
- Double bounce.
- Refusal.
- Inferred condition.
- Review status.

The graph must keep depth increasing downward. AI-derived bearing or condition text is review-required and cannot be issued as final without human approval.

### QA

The QA view consolidates validation findings, missing fields, AS1726 terminology checks, unsupported recommendations, placeholder leakage, repeated wording, and export readiness.

## Right Inspector / Review Panel

The inspector changes based on selection:

- Selected core interval.
- Selected grid row.
- Selected report section.
- Selected template field.
- Selected warning.
- Selected previous report reference.

Fields:

- Depth from/to.
- RL.
- Lithology.
- Colour.
- Weathering.
- Strength.
- Defects.
- RQD.
- TCR.
- Fracture spacing.
- Sample type.
- Confidence.
- Source evidence.
- AI status.
- Human review status.

Review statuses:

- Draft.
- AI Suggested.
- Needs Review.
- Reviewed.
- Approved.
- Locked.

Actions:

- Accept.
- Edit.
- Reject.
- Lock.
- Apply to similar intervals.
- Add reviewer note.

Change display uses `OLD VALUE -> NEW VALUE`. Yellow means AI/inferred, amber means uncertain, red means invalid/missing, and green means approved.

## Bottom Validation And Activity Stream

The bottom strip shows:

- API status.
- OCR status.
- DeepSeek status.
- OpenCV status.
- PDF status.
- Validation count.
- Export readiness.
- Current task logs.

Validation categories:

- Missing project fields.
- Invalid depth continuity.
- Duplicate intervals.
- Overlapping strata.
- Missing groundwater status.
- Missing borehole ID.
- Uncertain RQD.
- Unsupported AI inference.
- AS1726 terminology warning.
- Report placeholder leakage.

## Export Controls

Persistent export actions:

- Save.
- Quick Log.
- Generate PDF.
- Generate DOCX.
- Export Excel.
- Export JSON.
- Upload to storage.
- Lock for issue.

Rules:

- Quick Log is allowed in draft.
- Final PDF requires critical fields approved, or explicitly marked as issued with review exceptions.
- Client issue requires reviewer lock.

## AI Field Metadata

Every AI-generated field stores:

- Value.
- Source.
- Confidence.
- Reasoning summary.
- Review status.
- Evidence type.
- Timestamp.
- Model used.
- Human override.

Reasoning is exposed only as concise summaries, confidence labels, evidence, and validation flags. Chain-of-thought is never shown.

## AS1726 Rules

Soil descriptions follow AS1726 conventions:

- Major fraction uppercase.
- Minor fraction lowercase.
- Correct descriptor ordering.
- Colour, moisture, consistency/density, plasticity, origin, inclusions.

Examples:

- `gravelly SAND`.
- `sandy CLAY`.
- `silty CLAY`.
- `clayey SAND`.

Rock descriptions:

- Rock name uppercase.
- Weathering code.
- Strength.
- Defects.
- Bedding/fracturing.
- Infill, roughness, aperture.

Example:

`SANDSTONE: MW, light grey, fine grained, moderately strong, closely fractured, iron stained joints.`

## Validation Rules

The UI and backend validation should flag:

- Overlapping depth intervals.
- Duplicate intervals.
- `depth_to <= depth_from`.
- Borehole final depth not matching maximum interval.
- RQD/TCR outside 0-100.
- Groundwater fabricated or unsupported.
- Coordinates fabricated or unsupported.
- Non-AS1726 material descriptions.
- Placeholders remaining in DOCX/PDF.
- Unsupported recommendations.
- Missing client/project fields.
- Previous-report text copied without adaptation.

## Implementation Strategy

Implement this as a frontend shell upgrade around the current app:

- Preserve current backend/API logic.
- Preserve current PDF/rendering logic.
- Preserve current rock-core extraction flow.
- Replace the current visual shell with the light OpenGround x KORE cockpit.
- Add project explorer, workflow tabs, right inspector, validation strip, review status badges, confidence markers, and export readiness controls.

The first implementation should focus on static but data-connected UI scaffolding using existing API responses and current sample state. Deeper backend schema changes, ColBERT retrieval, and template registry expansion can be separate follow-up specs.

## Testing Strategy

Verification should include:

- Frontend build passes.
- Existing backend tests still pass if backend is touched.
- The protected report preview still renders.
- Depth graph remains inverted where applicable.
- Critical labels do not overflow at desktop and mobile widths.
- Export buttons enforce review readiness states visually.
- AI-suggested and approved states are visually distinguishable.

## Open Questions Resolved

This spec assumes the first implementation is UI shell and workflow scaffolding only. It does not modify protected borehole/PDF renderer internals and does not add new geotechnical calculations without a separate test-backed plan.
