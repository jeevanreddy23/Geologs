# SKILL_ROCK_CORE.md

## Meta Info
- **Version**: 1.0.0
- **Standard**: AS 1726:2017 (Geotechnical Site Investigations)
- **Application Target**: AutoSoil Rock Core Logging Pipeline

---

## Slow State (Core Logic / Protected Invariants)
> [!IMPORTANT]
> The principles and protocols documented in this section are PROTECTED INVARIANTS and MUST NEVER be modified, deleted, or overridden.

### 1. Rock Strata Logging Protocols (AS 1726:2017)
- **Terminology Invariants**:
  - Rock Material Name must be capitalised (e.g., SILTSTONE, SANDSTONE, SHALE, BASALT).
  - Weathering Classification must conform to the AS 1726 table:
    - **XW**: Extremely Weathered
    - **HW**: Highly Weathered
    - **MW**: Moderately Weathered
    - **SW**: Slightly Weathered
    - **FR**: Fresh
  - Estimated Strength $I_s(50)$ must be quantified and mapped to the standard classification:
    - **VL** (Very Low): $< 0.1 \text{ MPa}$
    - **L** (Low): $0.1 - 0.3 \text{ MPa}$
    - **M** (Medium): $0.3 - 1.0 \text{ MPa}$
    - **H** (High): $1.0 - 3.0 \text{ MPa}$
    - **VH** (Very High): $3.0 - 10.0 \text{ MPa}$
    - **EH** (Extremely High): $> 10.0 \text{ MPa}$

### 2. Core Box Metrics Verification Rules
- **TCR (Total Core Recovery)**:
  $$\text{TCR} = \left(\frac{\text{Length of Core Recovered}}{\text{Total Length of Core Run}}\right) \times 100\%$$
  *Invariant*: $\text{TCR} \le 100\%$. If computed TCR exceeds 100%, reject input and raise QA failure.
- **RQD (Rock Quality Designation)**:
  $$\text{RQD} = \left(\frac{\sum \text{Length of intact core pieces } > 10\text{ cm}}{\text{Total Length of Core Run}}\right) \times 100\%$$
  *Invariant*: $\text{RQD} \le \text{TCR}$. If computed RQD exceeds TCR, flag validation error.

### 3. PDF Layout Invariants (Bentley OpenGround Format)
- **Dimensions**: Standard A4 portrait grid ($595.27 \times 841.89 \text{ points}$).
- **Page Layout**:
  - **Soil Logs**: Header (Project, BH metadata), Main columns (Groundwater, Samples, Depth, Graphic, Description, Class, Consistency, Moisture), Footer (Abbreviations, sheet numbers).
  - **Rock Logs**: Header (Same), Main columns (Method, Flush, TCR, RQD, Depth, Graphic, RL, Description, Weathering, Strength Is(50), Discontinuities, Fracture Spacing), Footer (Same).
  - Plotted points for estimated strength must draw an axial point (black triangle pointing down) or diametral point (hollow circle) at their corresponding standard log category x-coordinates.

---

## Fast State (Context Memory)
- **Current Image**: `C:\Users\pored\Downloads\original_ddcdfd22-5d5e-4175-8077-c51aa0ea0b3b_1779249558173.png`
- **Current Target PDF**: `C:\Users\pored\Downloads\log-MPA-BH04.pdf`
- **Borehole Extracted Metadata**:
  - Project ID: `32904/2304E-G`
  - Borehole ID: `MPA-BH04`
  - Client: `By Group Pty Ltd`
  - Address: `105-113 Hollinsworth Road, Marsden Park`
  - Plant / Rig: `Hanjin Rig`
  - Drilling Co: `Geosense Drilling Engineers`
  - Surface RL: `~40.70 m (AHD)`
  - Drill Bit: `Auger`
  - Inclination: `90°`
  - Hole Diameter: `100 mm`
  - Logged Start: `7.60m`
  - Logged End: `15.74m`

---

## Strict Validation Gates
1. **OCR Sanity Check**: OCR output must contain digits matching the target project ID (`32904`) and borehole name (`BH04`). If absent, raise low-confidence warning.
2. **Strict Edit Budget**: Only 1-4 high-quality edits are allowed per cycle to protect the integrity of the slow state and minimize model drift.
3. **Entropy Audit**: Any redundant instructions or comments inside the PDF generator must be periodically removed.
