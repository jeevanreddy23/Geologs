---
name: report-writer
description: Drafts final geotechnical reports combining outputs from other skills and RAG templates.
---

# Report Writer

## Trigger Words
"Draft report", "generate report", "write final report"

## Workflow Steps
1. Gather all drafted text from sub-skills (e.g., DCP Assessment, Core Logging).
2. Query the RAG `rag/templates` folder for the correct client structure.
3. Query `rag/previous_reports` for stylistic matching and phrasing.
4. Draft the report in markdown format.
5. Apply the QA Validation Checklist.
6. Submit for Engineer Approval.

## Required Inputs
- Outputs from all analytical skills.
- Project Metadata (Client, Location, Type).

## Output Format
- Full comprehensive markdown document structured according to the retrieved template.

## QA Checklist
- [ ] Does the report follow AS1726 terminology?
- [ ] Have all anomalies been flagged for human review?
- [ ] Are recommendations consistent with past reports?

## Common Wording Examples
* "The fieldwork was carried out in general accordance with Australian Standard AS 1726:2017."*
* "We recommend a site classification of Class M in accordance with AS 2870-2011."*
