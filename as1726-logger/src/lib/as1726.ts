export const SOIL_MAJORS = [
  "CLAY", "SILT", "SAND", "GRAVEL", "COBBLES", "BOULDERS"
] as const;

export const ROCK_MAJORS = [
  "SANDSTONE", "SILTSTONE", "MUDSTONE", "SHALE", "BASALT", "GRANITE", "DIORITE", "LIMESTONE", "CONGLOMERATE", "TUFF", "ROCK"
] as const;

export const PLASTICITY = [
  "LowP", "MediumP", "HighP"
] as const;

export const CONSISTENCY = [
  "VerySoft", "Soft", "Firm", "Stiff", "VeryStiff", "Hard"
] as const;

export const DENSITY = [
  "VeryLoose", "Loose", "MediumDense", "Dense", "VeryDense"
] as const;

export const MOISTURE = [
  "Dry", "Moist", "Wet", "Saturated"
] as const;

export const WEATHERING = [
  "Fresh", "SlightlyWeathered", "ModeratelyWeathered", "HighlyWeathered", "ExtremelyWeathered", "ResidualSoil"
] as const;

export const STRENGTH = [
  "ExtremelyLow", "VeryLow", "Low", "Medium", "High", "VeryHigh", "ExtremelyHigh"
] as const;

export type MaterialType = "soil" | "rock";
export type MajorMaterial = typeof SOIL_MAJORS[number] | typeof ROCK_MAJORS[number];

export interface LayerInput {
  id: string; // unique ID for React keys
  depthFrom: number | null;
  depthTo: number | null;
  type: MaterialType;
  major: string; // Allows string to not strictly break if user types
  uscs: string;
  plasticity?: typeof PLASTICITY[number];
  consistency?: typeof CONSISTENCY[number];
  density?: typeof DENSITY[number];
  moisture?: typeof MOISTURE[number];
  weathering?: typeof WEATHERING[number];
  strength?: typeof STRENGTH[number];
  description: string;
  defects?: string;
}

export interface FieldIssue {
  field: keyof LayerInput;
  message: string;
}

export function computeDerived(layer: LayerInput): Partial<LayerInput> {
  const updates: Partial<LayerInput> = {};
  
  if (layer.type === "soil") {
    // Basic USCS Derivation logic based on AS1726 principles
    if (layer.major === "CLAY") {
      if (layer.plasticity === "HighP") updates.uscs = "CH";
      else if (layer.plasticity === "MediumP") updates.uscs = "CI";
      else if (layer.plasticity === "LowP") updates.uscs = "CL";
      else updates.uscs = "C"; // Generic Clay
    } else if (layer.major === "SILT") {
      if (layer.plasticity === "HighP") updates.uscs = "MH";
      else if (layer.plasticity === "MediumP") updates.uscs = "MI";
      else if (layer.plasticity === "LowP") updates.uscs = "ML";
      else updates.uscs = "M";
    } else if (layer.major === "SAND") {
      updates.uscs = "S"; // Needs grading to be SW or SP, assuming generic for now
    } else if (layer.major === "GRAVEL") {
      updates.uscs = "G";
    }
    
    // Clear out rock fields
    updates.weathering = undefined;
    updates.strength = undefined;
  } else if (layer.type === "rock") {
    // Clear out soil fields
    updates.uscs = "";
    updates.plasticity = undefined;
    updates.consistency = undefined;
    updates.density = undefined;
  }

  return updates;
}

export function validateRow(layer: LayerInput): FieldIssue[] {
  const issues: FieldIssue[] = [];

  if (layer.depthFrom === null || layer.depthFrom === undefined || isNaN(layer.depthFrom)) {
    issues.push({ field: "depthFrom", message: "Depth From is required." });
  }
  if (layer.depthTo === null || layer.depthTo === undefined || isNaN(layer.depthTo)) {
    issues.push({ field: "depthTo", message: "Depth To is required." });
  }

  if (layer.depthFrom !== null && layer.depthTo !== null && layer.depthFrom >= layer.depthTo) {
    issues.push({ field: "depthTo", message: "Depth To must be greater than Depth From." });
  }

  if (!layer.major) {
    issues.push({ field: "major", message: "Major material is required." });
  }

  if (layer.type === "soil") {
    if (layer.weathering) issues.push({ field: "weathering", message: "Weathering applies to rock only." });
    if (layer.strength) issues.push({ field: "strength", message: "Strength applies to rock only." });
    
    if (layer.major === "CLAY" || layer.major === "SILT") {
      if (layer.density) issues.push({ field: "density", message: "Density applies to coarse soils." });
    } else if (layer.major === "SAND" || layer.major === "GRAVEL") {
      if (layer.consistency) issues.push({ field: "consistency", message: "Consistency applies to fine soils." });
      if (layer.plasticity) issues.push({ field: "plasticity", message: "Plasticity applies to fine soils." });
    }
  } else if (layer.type === "rock") {
    if (layer.plasticity) issues.push({ field: "plasticity", message: "Plasticity applies to soil only." });
    if (layer.consistency) issues.push({ field: "consistency", message: "Consistency applies to soil only." });
    if (layer.density) issues.push({ field: "density", message: "Density applies to soil only." });
  }

  return issues;
}

export function validateContinuity(layers: LayerInput[]): { rowIndex: number, message: string }[] {
  const issues: { rowIndex: number, message: string }[] = [];
  
  // Ensure sorted by depthFrom
  const sorted = [...layers].sort((a, b) => (a.depthFrom || 0) - (b.depthFrom || 0));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.depthTo !== null && next.depthFrom !== null) {
      if (current.depthTo < next.depthFrom) {
        issues.push({ rowIndex: i, message: `Gap between ${current.depthTo}m and ${next.depthFrom}m.` });
      } else if (current.depthTo > next.depthFrom) {
        issues.push({ rowIndex: i, message: `Overlap between row ${i + 1} and ${i + 2}.` });
      }
    }
  }

  return issues;
}

export function blocksSave(layers: LayerInput[]): { ok: boolean, issues: string[] } {
  const allIssues: string[] = [];
  
  layers.forEach((layer, idx) => {
    const rowIssues = validateRow(layer);
    rowIssues.forEach(i => allIssues.push(`Row ${idx + 1} (${i.field}): ${i.message}`));
  });

  const continuityIssues = validateContinuity(layers);
  continuityIssues.forEach(i => allIssues.push(i.message));

  return {
    ok: allIssues.length === 0,
    issues: allIssues
  };
}
