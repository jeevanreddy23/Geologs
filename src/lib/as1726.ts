export interface DCPReading {
  blows: number;
  isDoubleBound: boolean;
}

export interface SPTResult {
  n1: string;
  n2: string;
  n3: string;
  penetration: string;
}

export interface SPTTest {
  depth: number;
  n1: string;
  n2: string;
  n3: string;
  penetration: string;
}

export const MOISTURE_OPTIONS = ["Dry", "Moist", "Wet"] as const;

export interface SoilLayer {
  id: string;
  depthFrom: string;
  depthTo: string;
  primarySoilType: string;
  secondaryDescriptors: string[];
  plasticity: string;
  moisture: string;
  colour: string;
  colourBecoming: string;
  minorComponents: string[];
  dcpReadings: DCPReading[];
  dcpStartDepth: string;
  sptResult: SPTResult | null;
  liquidLimit: string;
  plasticLimit: string;
  plasticityIndex: string;
  moistureContent: string;
  cbrValue: string;
  salinity: string;
  aggressivity: string;
  gradingSummary: string;
  photoUrls: string[];
}

export interface BoreholeProject {
  projectName: string;
  boreholeId: string;
  totalDepth: string;
  layers: SoilLayer[];
  dcpReadings: DCPReading[];
  dcpStartDepth: string;
  sptResult: SPTResult | null;
  sptTests: SPTTest[];
}

// Keep backward-compat type alias for existing components
export interface BoreholeEntry {
  projectName: string;
  boreholeId: string;
  depthFrom: string;
  depthTo: string;
  primarySoilType: string;
  secondaryDescriptors: string[];
  plasticity: string;
  colour: string;
  colourBecoming: string;
  minorComponents: string[];
  dcpReadings: DCPReading[];
  dcpStartDepth: string;
  sptResult: SPTResult | null;
  sptN: string;
  sptN60: string;
  dcpBlows: string;
  cptValue: string;
  liquidLimit: string;
  plasticLimit: string;
  plasticityIndex: string;
  moistureContent: string;
  cbrValue: string;
  gradingSummary: string;
  photoUrl: string | null;
}

export function createLayerId(): string {
  return crypto.randomUUID();
}

export const defaultLayer: SoilLayer = {
  id: "",
  depthFrom: "",
  depthTo: "",
  primarySoilType: "",
  secondaryDescriptors: [],
  plasticity: "",
  moisture: "",
  colour: "",
  colourBecoming: "",
  minorComponents: [],
  dcpReadings: [],
  dcpStartDepth: "",
  sptResult: null,
  liquidLimit: "",
  plasticLimit: "",
  plasticityIndex: "",
  moistureContent: "",
  cbrValue: "",
  salinity: "",
  aggressivity: "",
  gradingSummary: "",
  photoUrls: [],
};

export const defaultProject: BoreholeProject = {
  projectName: "",
  boreholeId: "",
  totalDepth: "30",
  layers: [],
  dcpReadings: [],
  dcpStartDepth: "",
  sptResult: null,
  sptTests: [],
};

export const defaultEntry: BoreholeEntry = {
  projectName: "",
  boreholeId: "",
  depthFrom: "",
  depthTo: "",
  primarySoilType: "",
  secondaryDescriptors: [],
  plasticity: "",
  colour: "",
  colourBecoming: "",
  minorComponents: [],
  dcpReadings: [],
  dcpStartDepth: "",
  sptResult: null,
  sptN: "",
  sptN60: "",
  dcpBlows: "",
  cptValue: "",
  liquidLimit: "",
  plasticLimit: "",
  plasticityIndex: "",
  moistureContent: "",
  cbrValue: "",
  gradingSummary: "",
  photoUrl: null,
};

export const PRIMARY_SOIL_TYPES = [
  "CLAY", "SILT", "SAND", "GRAVEL", "COBBLES",
  "BOULDERS", "FILL", "TOPSOIL", "PEAT", "ROCK", "ROAD BASE",
];

export const SECONDARY_DESCRIPTORS = [
  "Silty", "Sandy", "Clayey", "Gravelly",
];

export const MINOR_COMPONENTS = [
  "trace gravel", "trace sand", "trace silt", "trace clay",
  "some gravel", "some sand", "some silt", "some clay",
  "with rootlets", "with organics", "with rock fragments", "with calcareous nodules",
];

export const COLOURS = [
  "brown", "dark brown", "light brown", "red-brown", "orange-brown", "yellow-brown",
  "grey", "dark grey", "light grey", "blue-grey", "green-grey",
  "mottled grey and brown", "white", "cream", "black", "red", "orange", "yellow",
];

export function formatAS1726Description(layer: SoilLayer | BoreholeEntry): string {
  const parts: string[] = [];
  if (layer.secondaryDescriptors.length > 0) {
    parts.push(layer.secondaryDescriptors.join(" "));
  }
  if (layer.primarySoilType) {
    parts.push(layer.primarySoilType.toUpperCase());
  }
  if (layer.plasticity) {
    parts.push(`${layer.plasticity.toLowerCase()} plasticity`);
  }
  if (layer.colour) {
    let colourStr = layer.colour;
    if (layer.colourBecoming) {
      colourStr += ` becoming ${layer.colourBecoming}`;
    }
    parts.push(colourStr);
  }
  if (layer.minorComponents.length > 0) {
    parts.push(layer.minorComponents.join(", "));
  }
  return parts.join(", ");
}

export function formatDepthRange(layer: { depthFrom: string; depthTo: string }): string {
  if (layer.depthFrom && layer.depthTo) {
    return `${layer.depthFrom}m – ${layer.depthTo}m`;
  }
  return "";
}

export function formatDCPResults(layer: SoilLayer | BoreholeEntry): string {
  const readings = layer.dcpReadings;
  if (!readings || readings.length === 0) return "";
  const startDepth = parseFloat(layer.dcpStartDepth) || parseFloat(layer.depthFrom) || 0;
  const blowStrs = readings.map((r) =>
    r.isDoubleBound ? `${r.blows} db` : `${r.blows}`
  );
  const endDepth = startDepth + readings.length * 0.1;
  return `DCP (blows/0.1m): ${blowStrs.join(", ")} [${startDepth.toFixed(1)}m–${endDepth.toFixed(1)}m]`;
}

export function formatSPTResult(layer: SoilLayer | BoreholeEntry): string {
  const spt = layer.sptResult;
  if (spt && (spt.n1 || spt.n2 || spt.n3)) {
    const parts = [spt.n1 || "—", spt.n2 || "—", spt.n3 || "—"];
    const pen = spt.penetration || "450 mm";
    const nValue = (parseInt(spt.n2) || 0) + (parseInt(spt.n3) || 0);
    return `SPT N = ${parts.join("/")} (${pen}), N-value = ${nValue}`;
  }
  // Legacy fallback
  if ("sptN" in layer && (layer as BoreholeEntry).sptN) {
    const e = layer as BoreholeEntry;
    let result = `SPT N = ${e.sptN}`;
    if (e.sptN60) result += `, N60 = ${e.sptN60}`;
    return result;
  }
  return "";
}

export function formatTestResults(layer: SoilLayer | BoreholeEntry): string[] {
  const results: string[] = [];
  const spt = formatSPTResult(layer);
  if (spt) results.push(spt);
  const dcp = formatDCPResults(layer);
  if (dcp) results.push(dcp);
  if ("cptValue" in layer && (layer as BoreholeEntry).cptValue) results.push(`CPT = ${(layer as BoreholeEntry).cptValue}`);
  if (layer.liquidLimit) results.push(`LL = ${layer.liquidLimit}%`);
  if (layer.plasticLimit) results.push(`PL = ${layer.plasticLimit}%`);
  if (layer.plasticityIndex) results.push(`PI = ${layer.plasticityIndex}%`);
  if (layer.moistureContent) results.push(`MC = ${layer.moistureContent}%`);
  if (layer.cbrValue) results.push(`CBR = ${layer.cbrValue}%`);
  if ("salinity" in layer && layer.salinity) results.push(`Salinity = ${layer.salinity}`);
  if ("aggressivity" in layer && layer.aggressivity) results.push(`Aggressivity = ${layer.aggressivity}`);
  return results;
}

/** Convert a SoilLayer to a BoreholeEntry for backward compat */
export function layerToEntry(layer: SoilLayer, project: BoreholeProject): BoreholeEntry {
  return {
    projectName: project.projectName,
    boreholeId: project.boreholeId,
    depthFrom: layer.depthFrom,
    depthTo: layer.depthTo,
    primarySoilType: layer.primarySoilType,
    secondaryDescriptors: layer.secondaryDescriptors,
    plasticity: layer.plasticity,
    colour: layer.colour,
    colourBecoming: layer.colourBecoming,
    minorComponents: layer.minorComponents,
    dcpReadings: layer.dcpReadings,
    dcpStartDepth: layer.dcpStartDepth,
    sptResult: layer.sptResult,
    sptN: "",
    sptN60: "",
    dcpBlows: "",
    cptValue: "",
    liquidLimit: layer.liquidLimit,
    plasticLimit: layer.plasticLimit,
    plasticityIndex: layer.plasticityIndex,
    moistureContent: layer.moistureContent,
    cbrValue: layer.cbrValue,
    gradingSummary: layer.gradingSummary,
    photoUrl: layer.photoUrls[0] || null,
  };
}
