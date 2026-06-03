---
name: dcp-assessment
description: Processes DCP values, calculates bearing capacity, and flags uncertainty based on RAG context.
---

# DCP Assessment

## Trigger Words
"Process DCP", "bearing capacity", "DCP evaluation", "foundation assessment"

## Workflow Steps
1. Asks user for raw DCP values (blows per 100mm/300mm).
2. Retrieves similar reports from the RAG store.
3. Checks required bearing capacity against project requirements.
4. Generates a foundation recommendation based on historical matches.
5. Flags uncertainty if data is anomalous or deviates significantly from RAG examples.

## Required Inputs
- Raw DCP log data
- Required Bearing Capacity (kPa)
- Depth of testing

## Output Format
- Markdown summary with tabulated DCP interpretation.
- Paragraph containing the recommended allowable bearing capacity.

## QA Checklist
- [ ] Are the blows per 100mm correctly converted to blows per 300mm?
- [ ] Is the recommended bearing capacity within safe historical limits?
- [ ] Has uncertainty been explicitly stated?

## Common Wording Examples
* "Based on the DCP results (4-5 blows / 300mm), an allowable bearing pressure of 100 kPa may be adopted for shallow foundations."*
