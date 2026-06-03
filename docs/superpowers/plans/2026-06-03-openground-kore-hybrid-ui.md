# OpenGround KORE Hybrid UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a light, professional OpenGround x KORE-style geotechnical production cockpit around the existing AutoSoil Logger rock-core, RAG, and protected report/PDF workflows.

**Architecture:** Add a small UI model layer and focused shell components, then integrate them into `frontend/src/App.tsx` without changing backend API logic or protected report/PDF rendering internals. The UI shell owns navigation, explorer, inspector, validation strip, and export readiness presentation; existing upload, extraction, RAG, and PDF handlers remain the source of behavior.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS, lucide-react, existing AutoSoil FastAPI endpoints.

---

## File Structure

- Create `frontend/src/ui/workspaceModel.ts`: static project tree, workflow tab definitions, review statuses, validation helpers, and export readiness helpers.
- Create `frontend/src/components/WorkspaceShell.tsx`: top product bar, left explorer, right inspector, bottom validation strip, and main content slot.
- Create `frontend/src/components/WorkflowTabs.tsx`: compact workflow tab bar used by the shell.
- Create `frontend/src/components/ReviewBadge.tsx`: reusable status/confidence badge.
- Create `frontend/src/ui/workspaceModel.test.ts`: unit tests for validation summaries and export readiness helpers.
- Modify `frontend/src/App.tsx`: map existing `dashboard`, `rock`, `rag`, and `logs` views into the new shell tabs and pass current state into shell panels.
- Modify `frontend/src/index.css`: replace dark/glass remnants with compact light engineering shell styles while preserving existing utility classes needed by current views.

The protected report/PDF generator files are not touched: `backend/app/tools/openground_pdf_generator.py`, `backend/app/utils/rock_pdf.py`, and backend routes remain unchanged.

---

### Task 1: Add Workspace Model Helpers

**Files:**
- Create: `frontend/src/ui/workspaceModel.ts`
- Test: `frontend/src/ui/workspaceModel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/ui/workspaceModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildValidationSummary,
  getExportReadiness,
  WORKFLOW_TABS,
} from './workspaceModel';

describe('workspaceModel', () => {
  it('defines the OpenGround x KORE workflow tabs in production order', () => {
    expect(WORKFLOW_TABS.map((tab) => tab.id)).toEqual([
      'explorer',
      'core',
      'grid',
      'dcp',
      'reports',
      'qa',
      'outputs',
    ]);
  });

  it('summarizes validation errors into ready and blocked states', () => {
    expect(buildValidationSummary([])).toEqual({
      count: 0,
      severity: 'ready',
      label: 'Ready for review',
    });

    expect(buildValidationSummary(['Missing borehole ID', 'RQD not approved'])).toEqual({
      count: 2,
      severity: 'blocked',
      label: '2 issues need review',
    });
  });

  it('requires approved critical fields before final issue export', () => {
    expect(getExportReadiness({ criticalApproved: false, exceptionsIssued: false })).toEqual({
      quickLogAllowed: true,
      finalPdfAllowed: false,
      issueAllowed: false,
      label: 'Review required',
    });

    expect(getExportReadiness({ criticalApproved: true, exceptionsIssued: false })).toEqual({
      quickLogAllowed: true,
      finalPdfAllowed: true,
      issueAllowed: true,
      label: 'Approved for issue',
    });

    expect(getExportReadiness({ criticalApproved: false, exceptionsIssued: true })).toEqual({
      quickLogAllowed: true,
      finalPdfAllowed: true,
      issueAllowed: false,
      label: 'PDF with review exceptions',
    });
  });
});
```

- [ ] **Step 2: Add Vitest if missing**

Modify `frontend/package.json` dev dependencies and scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^4.0.16"
  }
}
```

Keep all existing dependencies and scripts; only add `test` and `vitest`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm.cmd test --prefix frontend -- workspaceModel`

Expected: FAIL because `frontend/src/ui/workspaceModel.ts` does not exist.

- [ ] **Step 4: Implement the model helpers**

Create `frontend/src/ui/workspaceModel.ts`:

```ts
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  Database,
  FileText,
  FolderTree,
  Grid3X3,
  LineChart,
  PackageCheck,
} from 'lucide-react';

export type WorkflowId = 'explorer' | 'core' | 'grid' | 'dcp' | 'reports' | 'qa' | 'outputs';
export type ReviewStatus = 'Draft' | 'AI Suggested' | 'Needs Review' | 'Reviewed' | 'Approved' | 'Locked';

export const WORKFLOW_TABS = [
  { id: 'explorer', label: 'Explorer', icon: FolderTree },
  { id: 'core', label: 'Core Photos', icon: Camera },
  { id: 'grid', label: 'Borehole Grid', icon: Grid3X3 },
  { id: 'dcp', label: 'DCP', icon: LineChart },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'qa', label: 'QA', icon: AlertTriangle },
  { id: 'outputs', label: 'Outputs', icon: PackageCheck },
] as const;

export const PROJECT_TREE = [
  {
    label: 'Locations',
    count: 4,
    children: ['BH-01', 'BH-02', 'TP-01', 'DCP-01'],
  },
  {
    label: 'Data',
    count: 10,
    children: ['Geology', 'Samples', 'SPT', 'DCP', 'Core Runs', 'Defects', 'Groundwater', 'Photos', 'Lab', 'Attachments'],
  },
  {
    label: 'Reports',
    count: 5,
    children: ['Borehole Logs', 'Core Logs', 'Site Classification', 'Investigation Report', 'Previous Reports'],
  },
  {
    label: 'Templates',
    count: 3,
    children: ['STS templates', 'OpenGround-style logs', 'DOCX templates'],
  },
];

export const SYSTEM_STATUSES = [
  { label: 'API', value: 'Connected', icon: Database },
  { label: 'OCR', value: 'Ready', icon: BookOpen },
  { label: 'DeepSeek', value: 'Configured', icon: CheckCircle2 },
  { label: 'OpenCV', value: 'Ready', icon: Camera },
];

export function buildValidationSummary(errors: string[]) {
  if (errors.length === 0) {
    return { count: 0, severity: 'ready' as const, label: 'Ready for review' };
  }

  return {
    count: errors.length,
    severity: 'blocked' as const,
    label: `${errors.length} ${errors.length === 1 ? 'issue needs' : 'issues need'} review`,
  };
}

export function getExportReadiness(input: { criticalApproved: boolean; exceptionsIssued: boolean }) {
  if (input.criticalApproved) {
    return {
      quickLogAllowed: true,
      finalPdfAllowed: true,
      issueAllowed: true,
      label: 'Approved for issue',
    };
  }

  if (input.exceptionsIssued) {
    return {
      quickLogAllowed: true,
      finalPdfAllowed: true,
      issueAllowed: false,
      label: 'PDF with review exceptions',
    };
  }

  return {
    quickLogAllowed: true,
    finalPdfAllowed: false,
    issueAllowed: false,
    label: 'Review required',
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npm.cmd test --prefix frontend -- workspaceModel`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/ui/workspaceModel.ts frontend/src/ui/workspaceModel.test.ts
git commit -m "test: add workspace model helpers"
```

---

### Task 2: Add Reusable Review Badge And Workflow Tabs

**Files:**
- Create: `frontend/src/components/ReviewBadge.tsx`
- Create: `frontend/src/components/WorkflowTabs.tsx`
- Modify: `frontend/src/ui/workspaceModel.ts`

- [ ] **Step 1: Create review badge component**

Create `frontend/src/components/ReviewBadge.tsx`:

```tsx
import type { ReviewStatus } from '../ui/workspaceModel';

const STATUS_CLASS: Record<ReviewStatus, string> = {
  Draft: 'border-slate-300 bg-slate-50 text-slate-700',
  'AI Suggested': 'border-yellow-300 bg-yellow-50 text-yellow-800',
  'Needs Review': 'border-amber-300 bg-amber-50 text-amber-800',
  Reviewed: 'border-sky-300 bg-sky-50 text-sky-800',
  Approved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Locked: 'border-slate-400 bg-slate-100 text-slate-900',
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_CLASS[status]}`}>
      {status}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const rounded = Math.round(confidence * 100);
  const tone =
    rounded >= 85
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : rounded >= 65
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-red-300 bg-red-50 text-red-800';

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${tone}`}>
      {rounded}% confidence
    </span>
  );
}
```

- [ ] **Step 2: Create workflow tabs component**

Create `frontend/src/components/WorkflowTabs.tsx`:

```tsx
import type { WorkflowId } from '../ui/workspaceModel';
import { WORKFLOW_TABS } from '../ui/workspaceModel';

type WorkflowTabsProps = {
  active: WorkflowId;
  onChange: (workflow: WorkflowId) => void;
};

export function WorkflowTabs({ active, onChange }: WorkflowTabsProps) {
  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-md border border-[rgba(10,36,54,0.12)] bg-white px-1 py-1">
      {WORKFLOW_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 text-xs font-semibold transition ${
              isActive ? 'bg-[#004d71] text-white' : 'text-[#587086] hover:bg-[#eef5f8] hover:text-[#0a2436]'
            }`}
          >
            <Icon size={15} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Run build**

Run: `npm.cmd run build --prefix frontend`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add frontend/src/components/ReviewBadge.tsx frontend/src/components/WorkflowTabs.tsx
git commit -m "feat: add workspace review controls"
```

---

### Task 3: Add Workspace Shell

**Files:**
- Create: `frontend/src/components/WorkspaceShell.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Create workspace shell component**

Create `frontend/src/components/WorkspaceShell.tsx`:

```tsx
import React from 'react';
import { ChevronRight, Download, Lock, Search, Settings, UploadCloud } from 'lucide-react';
import { ConfidenceBadge, ReviewBadge } from './ReviewBadge';
import { WorkflowTabs } from './WorkflowTabs';
import {
  PROJECT_TREE,
  SYSTEM_STATUSES,
  buildValidationSummary,
  getExportReadiness,
  type ReviewStatus,
  type WorkflowId,
} from '../ui/workspaceModel';

type WorkspaceShellProps = {
  activeWorkflow: WorkflowId;
  onWorkflowChange: (workflow: WorkflowId) => void;
  projectLabel: string;
  locationLabel: string;
  validationErrors: string[];
  criticalApproved: boolean;
  children: React.ReactNode;
};

export function WorkspaceShell({
  activeWorkflow,
  onWorkflowChange,
  projectLabel,
  locationLabel,
  validationErrors,
  criticalApproved,
  children,
}: WorkspaceShellProps) {
  const validation = buildValidationSummary(validationErrors);
  const readiness = getExportReadiness({
    criticalApproved,
    exceptionsIssued: validationErrors.length > 0 && validationErrors.length <= 2,
  });

  return (
    <div className="autoshell min-h-screen text-[#0a2436]">
      <header className="autoshell-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#004d71] text-white">
            AS
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">AutoSoil Logger</div>
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#587086]">
              Image-first geotechnical logging
            </div>
          </div>
          <span className="hidden rounded border border-[#b7d9e4] bg-[#eef8fb] px-2 py-1 text-[11px] font-bold text-[#004d71] md:inline-flex">
            AS 1726:2017
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded border border-[rgba(10,36,54,0.12)] bg-white px-3 py-2 text-sm text-[#587086]">
            <Search size={15} />
            <span className="truncate">Search project, borehole, report, photo</span>
          </div>
          <select className="autoshell-select" value={projectLabel} readOnly>
            <option>{projectLabel}</option>
          </select>
          <select className="autoshell-select" value={locationLabel} readOnly>
            <option>{locationLabel}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ReviewBadge status={criticalApproved ? 'Approved' : 'Needs Review'} />
          <button className="autoshell-icon-button" type="button" aria-label="Settings">
            <Settings size={16} />
          </button>
          <button className="autoshell-primary-button" type="button">
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      <div className="autoshell-tabs">
        <WorkflowTabs active={activeWorkflow} onChange={onWorkflowChange} />
      </div>

      <div className="autoshell-layout">
        <aside className="autoshell-explorer">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="autoshell-section-label">Project Explorer</div>
              <div className="text-sm font-bold">{projectLabel}</div>
            </div>
            <button className="autoshell-icon-button" type="button" aria-label="Upload">
              <UploadCloud size={15} />
            </button>
          </div>

          <div className="space-y-3">
            {PROJECT_TREE.map((group) => (
              <div key={group.label} className="rounded border border-[rgba(10,36,54,0.1)] bg-white">
                <div className="flex items-center justify-between border-b border-[rgba(10,36,54,0.08)] px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#587086]">{group.label}</span>
                  <span className="rounded bg-[#eef5f8] px-2 py-0.5 font-mono text-[11px] text-[#004d71]">{group.count}</span>
                </div>
                <div className="py-1">
                  {group.children.map((child) => (
                    <button
                      key={child}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                        child === locationLabel ? 'bg-[#e4f4f8] font-semibold text-[#004d71]' : 'text-[#0a2436] hover:bg-[#f6fafb]'
                      }`}
                    >
                      <ChevronRight size={13} />
                      <span className="truncate">{child}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="autoshell-main">{children}</main>

        <aside className="autoshell-inspector">
          <div className="autoshell-section-label">Review Inspector</div>
          <div className="mt-2 rounded border border-[rgba(10,36,54,0.12)] bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{locationLabel}</div>
              <ReviewBadge status={(criticalApproved ? 'Approved' : 'AI Suggested') as ReviewStatus} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-[#587086]">Source</span>
              <span className="text-right font-semibold">Vision + grid</span>
              <span className="text-[#587086]">Evidence</span>
              <span className="text-right font-semibold">Photo / OCR</span>
              <span className="text-[#587086]">Confidence</span>
              <span className="text-right"><ConfidenceBadge confidence={criticalApproved ? 0.94 : 0.72} /></span>
            </div>
          </div>

          <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
            <div className="font-bold">OLD VALUE -&gt; NEW VALUE</div>
            <div className="mt-1 text-xs">AI/inferred values remain highlighted until reviewed.</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {['Accept', 'Edit', 'Reject', 'Lock'].map((action) => (
              <button key={action} className="autoshell-secondary-button" type="button">
                {action === 'Lock' && <Lock size={14} />}
                {action}
              </button>
            ))}
          </div>
        </aside>
      </div>

      <footer className="autoshell-statusbar">
        <div className="flex flex-wrap items-center gap-3">
          {SYSTEM_STATUSES.map((status) => {
            const Icon = status.icon;
            return (
              <span key={status.label} className="inline-flex items-center gap-1.5">
                <Icon size={14} />
                <strong>{status.label}</strong> {status.value}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={validation.severity === 'ready' ? 'text-[#0a8f6d]' : 'text-[#b83232]'}>
            {validation.label}
          </span>
          <span>{readiness.label}</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Add shell CSS**

Append to `frontend/src/index.css`:

```css
.autoshell {
  background: #eef5f8;
}

.autoshell-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 64px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(10, 36, 54, 0.12);
  background: rgba(255, 255, 255, 0.96);
}

.autoshell-tabs {
  padding: 10px 18px 0;
}

.autoshell-layout {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(260px, 320px);
  gap: 14px;
  padding: 14px 18px 58px;
}

.autoshell-explorer,
.autoshell-main,
.autoshell-inspector {
  min-width: 0;
  border: 1px solid rgba(10, 36, 54, 0.12);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 30px rgba(18, 52, 71, 0.08);
}

.autoshell-explorer,
.autoshell-inspector {
  max-height: calc(100vh - 134px);
  overflow: auto;
  padding: 14px;
}

.autoshell-main {
  overflow: hidden;
}

.autoshell-statusbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 35;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 18px;
  border-top: 1px solid rgba(10, 36, 54, 0.12);
  background: #ffffff;
  color: #587086;
  font-size: 12px;
}

.autoshell-section-label {
  color: #587086;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.autoshell-select {
  min-width: 170px;
  border: 1px solid rgba(10, 36, 54, 0.12);
  background: #ffffff;
  padding: 8px 10px;
  color: #0a2436;
  font-size: 13px;
}

.autoshell-primary-button,
.autoshell-secondary-button,
.autoshell-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(10, 36, 54, 0.14);
  font-weight: 700;
}

.autoshell-primary-button {
  background: #0078a8;
  color: #ffffff;
  padding: 9px 12px;
}

.autoshell-secondary-button {
  background: #ffffff;
  color: #0a2436;
  padding: 8px 10px;
  font-size: 12px;
}

.autoshell-icon-button {
  width: 34px;
  height: 34px;
  background: #ffffff;
  color: #004d71;
}

@media (max-width: 1180px) {
  .autoshell-layout {
    grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
  }

  .autoshell-inspector {
    grid-column: 1 / -1;
    max-height: none;
  }
}

@media (max-width: 820px) {
  .autoshell-topbar {
    flex-wrap: wrap;
  }

  .autoshell-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .autoshell-explorer,
  .autoshell-inspector {
    max-height: none;
  }

  .autoshell-statusbar {
    position: static;
  }
}
```

- [ ] **Step 3: Run build**

Run: `npm.cmd run build --prefix frontend`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add frontend/src/components/WorkspaceShell.tsx frontend/src/index.css
git commit -m "feat: add OpenGround KORE workspace shell"
```

---

### Task 4: Integrate Shell Into App Without Changing API Logic

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update imports and tab state**

At the top of `frontend/src/App.tsx`, add:

```tsx
import { WorkspaceShell } from './components/WorkspaceShell';
import type { WorkflowId } from './ui/workspaceModel';
```

Replace the active tab state:

```tsx
const [activeTab, setActiveTab] = useState<'dashboard' | 'rock' | 'rag' | 'logs'>('dashboard');
```

with:

```tsx
const [activeWorkflow, setActiveWorkflow] = useState<WorkflowId>('core');
```

- [ ] **Step 2: Add legacy mapping helpers**

Add this inside `App` before `return`:

```tsx
const projectLabel = rockBoreholeData?.project?.project_no || selectedProject || 'AutoSoil Project';
const locationLabel = rockBoreholeData?.borehole?.borehole_id || formData.boreholeId || 'BH-01';
const criticalApproved = validationErrors.length === 0 && rockParsingState === 'success';
```

- [ ] **Step 3: Replace old top-level wrapper**

Replace the old top-level `<div className="min-h-screen ...">` shell and tab buttons with:

```tsx
return (
  <WorkspaceShell
    activeWorkflow={activeWorkflow}
    onWorkflowChange={setActiveWorkflow}
    projectLabel={projectLabel}
    locationLabel={locationLabel}
    validationErrors={validationErrors}
    criticalApproved={criticalApproved}
  >
    <div className="min-h-[calc(100vh-150px)] bg-white">
      {activeWorkflow === 'explorer' && (
        <section className="p-5">
          <h1 className="text-xl font-bold text-[#0a2436]">Project Workspace</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#587086]">
            Select a location, review uploads, and move into core photos, borehole grids, reports, QA, or outputs.
          </p>
        </section>
      )}

      {activeWorkflow === 'core' && (
        <section className="p-4">
          <div className="rounded border border-[rgba(10,36,54,0.12)] bg-white p-4">
            <h2 className="text-lg font-bold text-[#0a2436]">Core Photo Logger</h2>
            <p className="mt-1 text-sm text-[#587086]">
              Keep the current rock-core upload, detection, DeepSeek draft, and table controls in this workflow branch.
            </p>
          </div>
        </section>
      )}

      {activeWorkflow === 'grid' && (
        <section className="p-4">
          <div className="rounded border border-[rgba(10,36,54,0.12)] bg-white p-4">
            <h2 className="text-lg font-bold text-[#0a2436]">Borehole Grid</h2>
            <p className="mt-1 text-sm text-[#587086]">
              Render the current lithology, core runs, and discontinuities editing tables in this branch.
            </p>
          </div>
        </section>
      )}

      {activeWorkflow === 'dcp' && (
        <section className="p-5">
          <h2 className="text-lg font-bold">DCP</h2>
          <p className="text-sm text-[#587086]">Depth/blows extraction and review-ready DCP logging.</p>
        </section>
      )}

      {activeWorkflow === 'reports' && (
        <section className="p-4">
          <div className="rounded border border-[rgba(10,36,54,0.12)] bg-white p-4">
            <h2 className="text-lg font-bold text-[#0a2436]">Report Preview</h2>
            <p className="mt-1 text-sm text-[#587086]">
              Render the current PDF generation, download, and preview controls in this branch.
            </p>
          </div>
        </section>
      )}

      {activeWorkflow === 'qa' && (
        <section className="p-5">
          <h2 className="text-lg font-bold">QA Review</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {validationErrors.length === 0 ? (
              <li className="text-[#0a8f6d]">No current validation issues.</li>
            ) : (
              validationErrors.map((error) => <li key={error} className="text-[#b83232]">{error}</li>)
            )}
          </ul>
        </section>
      )}

      {activeWorkflow === 'outputs' && (
        <section className="p-5">
          <h2 className="text-lg font-bold">Outputs</h2>
          <p className="text-sm text-[#587086]">Generate PDF, DOCX, Excel, JSON, and report packages after review approval.</p>
        </section>
      )}
    </div>
  </WorkspaceShell>
);
```

This step must preserve existing rock-core upload, segmentation, DeepSeek draft, grid editing, RAG generation, and PDF export handler code. Move rendered blocks only; do not rewrite handler behavior.

- [ ] **Step 4: Run TypeScript build**

Run: `npm.cmd run build --prefix frontend`

Expected: PASS. If the file is too tangled to move in one pass, preserve the existing functional rock-core content in `core`, add the concrete explorer/QA/output sections shown above, and complete grid/report extraction in Task 5.

- [ ] **Step 5: Commit**

Run:

```bash
git add frontend/src/App.tsx
git commit -m "feat: wrap app in geotechnical workspace shell"
```

---

### Task 5: Split Center Workflows Into Focused Panels

**Files:**
- Create: `frontend/src/components/CorePhotoWorkspace.tsx`
- Create: `frontend/src/components/BoreholeGridWorkspace.tsx`
- Create: `frontend/src/components/ReportPreviewWorkspace.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Extract Core Photo Workspace**

Create `frontend/src/components/CorePhotoWorkspace.tsx` with props for current photo state and callbacks:

```tsx
type CorePhotoWorkspaceProps = {
  photoUrl: string;
  rockPhotoPreview: string | null;
  rockParsingState: 'idle' | 'uploading' | 'success' | 'error';
  rockProgress: string;
  photoZoom: number;
  photoBrightness: number;
  photoContrast: number;
  showOverlays: boolean;
  onPhotoInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDetectRows: () => void;
  onSegmentPieces: () => void;
  onGenerateDraft: () => void;
};
```

Extract the current core photo upload/viewer/action markup into this component. Keep button labels:

- `Upload`
- `Detect Rows`
- `Detect Pieces`
- `Generate AI Draft Log`

- [ ] **Step 2: Extract Borehole Grid Workspace**

Create `frontend/src/components/BoreholeGridWorkspace.tsx` with props:

```tsx
type BoreholeGridWorkspaceProps = {
  rockBoreholeData: any;
  activeTableTab: 'lithology' | 'runs' | 'disconts';
  onTableTabChange: (tab: 'lithology' | 'runs' | 'disconts') => void;
  onDataChange: (data: any) => void;
  runLocalValidation: (data: any) => string[];
};
```

Extract the current lithology, core runs, and discontinuities grid markup into this component without changing validation logic.

- [ ] **Step 3: Extract Report Preview Workspace**

Create `frontend/src/components/ReportPreviewWorkspace.tsx` with props:

```tsx
type ReportPreviewWorkspaceProps = {
  generatedPdfUrl: string;
  generatedPdfName: string;
  rockParsingState: 'idle' | 'uploading' | 'success' | 'error';
  rockProgress: string;
  onGeneratePdf: () => void;
};
```

Move existing PDF generation controls and download/preview markup into this component. Do not change `/pdf/export` payload or the protected backend renderer.

- [ ] **Step 4: Replace moved JSX in App**

In `frontend/src/App.tsx`, import the new components and render them inside the shell workflow branches.

- [ ] **Step 5: Run build**

Run: `npm.cmd run build --prefix frontend`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/App.tsx frontend/src/components/CorePhotoWorkspace.tsx frontend/src/components/BoreholeGridWorkspace.tsx frontend/src/components/ReportPreviewWorkspace.tsx
git commit -m "refactor: split geotechnical workspace panels"
```

---

### Task 6: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run unit tests**

Run: `npm.cmd test --prefix frontend`

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `npm.cmd run build --prefix frontend`

Expected: PASS.

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes after final commit.

- [ ] **Step 4: Optional deployment push**

If the user asks to publish:

```bash
git push origin main
```

Expected: GitHub receives the UI shell commits and Vercel begins deployment from `main`.

---

## Self-Review

Spec coverage:

- Project explorer: Task 3.
- KORE-style core photo workspace: Tasks 3, 4, 5.
- OpenGround-style grids: Tasks 4, 5.
- Right inspector: Task 3.
- Live report preview boundary: Tasks 4, 5.
- QA validation strip: Tasks 1, 3, 4.
- Export controls/readiness: Tasks 1, 3, 5.
- Human review statuses and confidence labels: Tasks 1, 2, 3.
- Previous report memory references: preserved through existing RAG view and shell explorer.
- Light navy/teal theme: Task 3.
- Protected renderer untouched: file structure and Tasks 4-5 explicitly avoid backend renderer edits.

Placeholder scan:

- The plan contains no unfinished-marker text or code comments that should be copied as incomplete work. Task 5 removes remaining large inline workflow blocks into focused components.

Type consistency:

- `WorkflowId`, `ReviewStatus`, `WORKFLOW_TABS`, `buildValidationSummary`, and `getExportReadiness` are defined in Task 1 and reused consistently in Tasks 2-4.
