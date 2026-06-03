from pydantic import BaseModel, Field
from typing import List, Optional, Any

class ProjectModel(BaseModel):
    project_no: str = ""
    client: str = ""
    address: str = ""
    date: str = ""
    logged_by: str = ""
    reviewed_by: str = ""

class BoreholeModel(BaseModel):
    borehole_id: str = ""
    surface_rl: Optional[float] = None
    hole_diameter_mm: Optional[float] = None
    inclination: float = 90.0
    drill_bit: str = ""
    drilling_contractor: str = ""
    rig: str = ""
    depth_from: Optional[float] = None
    depth_to: Optional[float] = None

class PhotoModel(BaseModel):
    file_name: str = ""
    type: str = "core_tray"
    depth_from: Optional[float] = None
    depth_to: Optional[float] = None
    processed: bool = False

class LithologyUnitModel(BaseModel):
    id: str = ""
    from_m: Optional[float] = Field(None, alias="from")
    to_m: Optional[float] = Field(None, alias="to")
    material: str = ""
    description: str = ""
    weathering: str = ""
    strength: str = ""
    structure: str = ""
    defects: str = ""
    confidence: float = 0.0
    review_required: bool = True
    
    class Config:
        populate_by_name = True

class DiscontinuityModel(BaseModel):
    id: str = ""
    depth: Optional[float] = None
    code: str = ""
    description: str = ""
    confidence: float = 0.0
    review_required: bool = True

class CoreRunModel(BaseModel):
    id: str = ""
    from_m: Optional[float] = Field(None, alias="from")
    to_m: Optional[float] = Field(None, alias="to")
    tcr: Optional[float] = None
    rqd: Optional[float] = None
    review_required: bool = True
    
    class Config:
        populate_by_name = True

class ReviewModel(BaseModel):
    status: str = "draft"
    approved_by: str = ""
    approved_at: str = ""
    missing_fields: List[str] = []

class AutoSoilDataModel(BaseModel):
    project: ProjectModel = Field(default_factory=ProjectModel)
    borehole: BoreholeModel = Field(default_factory=BoreholeModel)
    photos: List[PhotoModel] = Field(default_factory=list)
    lithology_units: List[LithologyUnitModel] = Field(default_factory=list)
    discontinuities: List[DiscontinuityModel] = Field(default_factory=list)
    core_runs: List[CoreRunModel] = Field(default_factory=list)
    samples_tests: List[Any] = Field(default_factory=list)
    review: ReviewModel = Field(default_factory=ReviewModel)
