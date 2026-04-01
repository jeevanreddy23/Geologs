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

  // Secondary descriptors first (lowercase adjective form)
  if (entry.secondaryDescriptors.length > 0) {
    parts.push(entry.secondaryDescriptors.join(" "));
  }

  // Primary soil type in CAPITALS
  if (entry.primarySoilType) {
    parts.push(entry.primarySoilType.toUpperCase());
  }

  // Plasticity
  if (entry.plasticity) {
    parts.push(`${entry.plasticity.toLowerCase()} plasticity`);
  }

  // Colour
  if (entry.colour) {
    let colourStr = entry.colour;
    if (entry.colourBecoming) {
      colourStr += ` becoming ${entry.colourBecoming}`;
    }
    parts.push(colourStr);
  }

  // Minor components
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

export function formatTestResults(entry: BoreholeEntry): string[] {
  const results: string[] = [];
  if (entry.sptN) results.push(`SPT N = ${entry.sptN}`);
  if (entry.sptN60) results.push(`N60 = ${entry.sptN60}`);
  if (entry.dcpBlows) results.push(`DCP = ${entry.dcpBlows} blows`);
  if (entry.cptValue) results.push(`CPT = ${entry.cptValue}`);
  if (entry.liquidLimit) results.push(`LL = ${entry.liquidLimit}%`);
  if (entry.plasticLimit) results.push(`PL = ${entry.plasticLimit}%`);
  if (entry.plasticityIndex) results.push(`PI = ${entry.plasticityIndex}%`);
  if (entry.moistureContent) results.push(`MC = ${entry.moistureContent}%`);
  if (entry.cbrValue) results.push(`CBR = ${entry.cbrValue}%`);
  return results;
}
