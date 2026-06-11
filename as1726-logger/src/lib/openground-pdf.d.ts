import type { ReactElement } from 'react'
import type { LayerInput, Defect } from './as1726'

export interface OpenGroundData {
  project: Record<string, unknown>
  borehole: Record<string, unknown>
  lithology_units: Array<Record<string, unknown>>
  core_runs: Array<Record<string, unknown>>
  discontinuities: Array<Record<string, unknown>>
}

export interface ProjectMeta {
  client?: string
  project_no?: string
  date?: string
  logged_by?: string
  reviewed_by?: string
  address?: string
  location_no?: string
  drilling_contractor?: string
  rig?: string
  surface_rl?: number | string
  inclination?: number | string
  drill_bit?: string
  hole_diameter_mm?: number | string
}

export function OpenGroundDocument(props: { data: OpenGroundData }): ReactElement

export function buildLogData(input: {
  projectName?: string
  holeId?: string
  project?: ProjectMeta
  layers: LayerInput[]
  defects?: Defect[]
}): OpenGroundData
