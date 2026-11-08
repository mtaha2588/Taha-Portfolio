"""Built-in implementation of the avalanche terrain demo."""

from functools import lru_cache

from .schemas import AssessmentRequest, AssessmentResponse, Factor, SlopeClass, TerrainSample
from .terrain import SLOPE_CLASSES, aspect_name, generate_dem, slope_aspect, slope_class

# The synthetic model always covers the same ground area, so slopes do not
# change with grid resolution; only the level of detail does.
EXTENT_M = 8000.0


@lru_cache(maxsize=16)
def terrain_sample(size: int, seed: int) -> TerrainSample:
    cell_size_m = EXTENT_M / (size - 1)
    dem = generate_dem(size, seed)
    slopes, _aspects = slope_aspect(dem, cell_size_m)

    flat_elev = [round(v, 1) for row in dem for v in row]
    flat_slope = [round(v, 1) for row in slopes for v in row]
    flat_class = [slope_class(v) for v in flat_slope]
    total = len(flat_class)

    classes = [
        SlopeClass(**c, share_pct=round(100 * flat_class.count(c["id"]) / total, 1)) for c in SLOPE_CLASSES
    ]
    return TerrainSample(
        seed=seed,
        size=size,
        cell_size_m=round(cell_size_m, 2),
        min_elevation_m=min(flat_elev),
        max_elevation_m=max(flat_elev),
        elevation_m=flat_elev,
        slope_deg=flat_slope,
        slope_class=flat_class,
        classes=classes,
        method="Procedural ridged-noise DEM; slope via Horn's 3x3 finite-difference method",
    )


def _angle_diff(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def assess(req: AssessmentRequest) -> AssessmentResponse:
    cls = slope_class(req.slope_deg)
    label = SLOPE_CLASSES[cls]["label"]

    snow_present = req.new_snow_cm >= 30
    snow_detail = (
        f"{req.new_snow_cm:g} cm of new snow in 72 h: significant new load."
        if snow_present
        else f"{req.new_snow_cm:g} cm of new snow in 72 h: below the ~30 cm level often treated as significant."
    )

    lee = None
    if req.aspect_deg is not None and req.wind_from_deg is not None:
        downwind = (req.wind_from_deg + 180) % 360
        lee = _angle_diff(req.aspect_deg, downwind) <= 60
    wind_present = req.wind_speed_kmh >= 25 and (lee is None or lee)
    if req.wind_speed_kmh < 25:
        wind_detail = f"Wind {req.wind_speed_kmh:g} km/h: generally too light to transport much snow."
    elif lee is None:
        wind_detail = f"Wind {req.wind_speed_kmh:g} km/h can transport snow; add aspect and wind direction to check lee loading."
    elif lee:
        wind_detail = f"Wind {req.wind_speed_kmh:g} km/h and this slope faces downwind (lee side): likely wind loading."
    else:
        wind_detail = f"Wind {req.wind_speed_kmh:g} km/h, but this slope faces into the wind (windward): less loading."

    warming_present = req.rapid_warming or (req.air_temp_c is not None and req.air_temp_c > 0)
    warming_detail = (
        "Above-freezing or rapidly rising temperatures can weaken the snowpack (wet-snow instability)."
        if warming_present
        else "No warming signal provided."
    )

    factors = [
        Factor(
            key="slope",
            label="Slope angle",
            present=cls == 2,
            detail=f"{req.slope_deg:g}° ({label}): {SLOPE_CLASSES[cls]['meaning']}",
        ),
        Factor(key="new_snow", label="New snow load", present=snow_present, detail=snow_detail),
        Factor(key="wind_loading", label="Wind loading", present=wind_present, detail=wind_detail),
        Factor(key="warming", label="Warming", present=warming_present, detail=warming_detail),
    ]
    loading = sum(f.present for f in factors[1:])

    if cls == 2:
        level = "high" if loading >= 1 else "elevated"
    elif cls in (1, 3):
        level = "elevated" if loading >= 2 else "low"
    else:
        level = "low"

    summary = {
        "high": "Avalanche-prone slope angle combined with at least one loading or weakening factor.",
        "elevated": "Terrain or conditions show some avalanche-relevant characteristics.",
        "low": "Few avalanche-relevant indicators for this slope with the values provided.",
    }[level]

    return AssessmentResponse(
        terrain_susceptibility=level,
        slope_class=cls,
        slope_class_label=label,
        aspect=aspect_name(req.aspect_deg) if req.aspect_deg is not None else None,
        factors=factors,
        summary=summary,
    )
