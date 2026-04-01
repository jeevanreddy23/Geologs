export interface DCPReading {
  blows: number;
  isDoubleBound: boolean;
}

export interface SPTResult {
  n1: string;
  n2: string;
  n3: string;
  penetration: string; // e.g. "450 mm"
}

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
  // DCP - array of blow counts per 0.1m interval
  dcpReadings: DCPReading[];
  dcpStartDepth: string;
  // SPT
  sptResult: SPTResult | null;
  // Legacy simple fields
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
  "CLAY",
  "SILT",
  "SAND",
  "GRAVEL",
  "COBBLES",
  "BOULDERS",
  "FILL",
  "TOPSOIL",
  "PEAT",
  "ROCK",
];

export const SECONDARY_DESCRIPTORS = [
  "Silty",
  "Sandy",
  "Clayey",
  "Gravelly",
];

export const MINOR_COMPONENTS = [
  "trace gravel",
  "trace sand",
  "trace silt",
  "trace clay",
  "some gravel",
  "some sand",
  "some silt",
  "some clay",
  "with rootlets",
  "with organics",
  "with rock fragments",
  "with calcareous nodules",
];

export const COLOURS = [
  "brown",
  "dark brown",
  "light brown",
  "red-brown",
  "orange-brown",
  "yellow-brown",
  "grey",
  "dark grey",
  "light grey",
  "blue-grey",
  "green-grey",
  "mottled grey and brown",
  "white",
  "cream",
  "black",
  "red",
  "orange",
  "yellow",
];

export function formatAS1726Description(entry: BoreholeEntry): string {
  const parts: string[] = [];

  if (entry.secondaryDescriptors.length > 0) {
    parts.push(entry.secondaryDescriptors.join(" "));
  }

  if (entry.primarySoilType) {
    parts.push(entry.primarySoilType.toUpperCase());
  }

  if (entry.plasticity) {
    parts.push(`${entry.plasticity.toLowerCase()} plasticity`);
  }

  if (entry.colour) {
    let colourStr = entry.colour;
    if (entry.colourBecoming) {
      colourStr += ` becoming ${entry.colourBecoming}`;
    }
    parts.push(colourStr);
  }

  if (entry.minorComponents.length > 0) {
    parts.push(entry.minorComponents.join(", "));
  }

  return parts.join(", ");
}

export function formatDepthRange(entry: BoreholeEntry): string {
  if (entry.depthFrom && entry.depthTo) {
    return `${entry.depthFrom}m – ${entry.depthTo}m`;
  }
  return "";
}

export function formatDCPResults(entry: BoreholeEntry): string {
  if (entry.dcpReadings.length === 0) return "";
  const startDepth = parseFloat(entry.dcpStartDepth) || parseFloat(entry.depthFrom) || 0;
  const blowStrs = entry.dcpReadings.map((r) => 
    r.isDoubleBound ? `${r.blows} db` : `${r.blows}`
  );
  const endDepth = startDepth + entry.dcpReadings.length * 0.1;
  return `DCP (blows/0.1m): ${blowStrs.join(", ")} [${startDepth.toFixed(1)}m–${endDepth.toFixed(1)}m]`;
}

export function formatSPTResult(entry: BoreholeEntry): string {
  if (entry.sptResult && (entry.sptResult.n1 || entry.sptResult.n2 || entry.sptResult.n3)) {
    const parts = [entry.sptResult.n1 || "—", entry.sptResult.n2 || "—", entry.sptResult.n3 || "—"];
    const pen = entry.sptResult.penetration || "450 mm";
    const n1 = parseInt(entry.sptResult.n1) || 0;
    const n2 = parseInt(entry.sptResult.n2) || 0;
    const n3 = parseInt(entry.sptResult.n3) || 0;
    const nValue = n2 + n3;
    return `SPT N = ${parts.join("/")} (${pen}), N-value = ${nValue}`;
  }
  // Fallback to legacy
  if (entry.sptN) {
    let result = `SPT N = ${entry.sptN}`;
    if (entry.sptN60) result += `, N60 = ${entry.sptN60}`;
    return result;
  }
  return "";
}

export function formatTestResults(entry: BoreholeEntry): string[] {
  const results: string[] = [];
  
  const spt = formatSPTResult(entry);
  if (spt) results.push(spt);
  
  const dcp = formatDCPResults(entry);
  if (dcp) results.push(dcp);
  
  if (entry.cptValue) results.push(`CPT = ${entry.cptValue}`);
  if (entry.liquidLimit) results.push(`LL = ${entry.liquidLimit}%`);
  if (entry.plasticLimit) results.push(`PL = ${entry.plasticLimit}%`);
  if (entry.plasticityIndex) results.push(`PI = ${entry.plasticityIndex}%`);
  if (entry.moistureContent) results.push(`MC = ${entry.moistureContent}%`);
  if (entry.cbrValue) results.push(`CBR = ${entry.cbrValue}%`);
  return results;
}
