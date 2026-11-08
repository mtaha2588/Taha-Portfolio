"""Synthetic terrain generation and standard terrain analysis.

The elevation model is generated procedurally (ridged fractal noise
around a central massif) because no real DEM is bundled. The ANALYSIS
is the standard GIS method, so the same functions work unchanged on a
real DEM grid (e.g. SRTM/Copernicus tiles) when you plug one in.
"""

import math
import random

# Slope-angle classes used in avalanche terrain assessment.
SLOPE_CLASSES = [
    {"id": 0, "label": "< 25°", "meaning": "Generally below avalanche start-zone angles (may still be a runout zone)."},
    {"id": 1, "label": "25–30°", "meaning": "Transitional: avalanches are possible but less frequent."},
    {"id": 2, "label": "30–45°", "meaning": "Primary avalanche start-zone angles."},
    {"id": 3, "label": "> 45°", "meaning": "Very steep: frequent small sluffs; deep slabs build up less often."},
]


def slope_class(slope_deg: float) -> int:
    if slope_deg < 25:
        return 0
    if slope_deg < 30:
        return 1
    if slope_deg <= 45:
        return 2
    return 3


def _smooth(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


class _ValueNoise:
    def __init__(self, seed: int, cells: int):
        rng = random.Random(seed)
        self.cells = cells
        self.grid = [[rng.random() for _ in range(cells + 1)] for _ in range(cells + 1)]

    def sample(self, u: float, v: float) -> float:
        """u, v in [0, 1]."""
        x = u * self.cells
        y = v * self.cells
        xi = min(int(x), self.cells - 1)
        yi = min(int(y), self.cells - 1)
        tx = _smooth(x - xi)
        ty = _smooth(y - yi)
        g = self.grid
        top = g[yi][xi] + (g[yi][xi + 1] - g[yi][xi]) * tx
        bottom = g[yi + 1][xi] + (g[yi + 1][xi + 1] - g[yi + 1][xi]) * tx
        return top + (bottom - top) * ty


def generate_dem(size: int, seed: int, base_m: float = 3200.0, relief_m: float = 3400.0) -> list[list[float]]:
    """Returns a size x size grid of elevations in metres (row 0 = north)."""
    octaves = [_ValueNoise(seed * 31 + i, 3 * 2**i) for i in range(5)]
    dem = []
    for r in range(size):
        v = r / (size - 1)
        row = []
        for c in range(size):
            u = c / (size - 1)
            # Ridged fractal noise: sharp crests like real mountain ridgelines.
            ridged = 0.0
            amplitude = 0.5
            total = 0.0
            for noise in octaves:
                n = 1.0 - abs(noise.sample(u, v) * 2.0 - 1.0)
                ridged += n * n * amplitude
                total += amplitude
                amplitude *= 0.5
            ridged /= total
            # A central massif so the model reads as one dominant mountain.
            dx = u - 0.5
            dy = v - 0.52
            radial = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) / 0.62)
            height = 0.62 * radial**1.6 + 0.38 * ridged * (0.35 + 0.65 * radial)
            row.append(base_m + relief_m * height)
        dem.append(row)
    return dem


def slope_aspect(dem: list[list[float]], cell_size_m: float) -> tuple[list[list[float]], list[list[float]]]:
    """Slope (degrees) and aspect (degrees clockwise from north) using Horn's 3x3 method."""
    rows = len(dem)
    cols = len(dem[0])

    def z(r: int, c: int) -> float:
        return dem[min(max(r, 0), rows - 1)][min(max(c, 0), cols - 1)]

    slopes: list[list[float]] = []
    aspects: list[list[float]] = []
    for r in range(rows):
        srow, arow = [], []
        for c in range(cols):
            a, b, cc = z(r - 1, c - 1), z(r - 1, c), z(r - 1, c + 1)
            d, f = z(r, c - 1), z(r, c + 1)
            g, h, i = z(r + 1, c - 1), z(r + 1, c), z(r + 1, c + 1)
            dzdx = ((cc + 2 * f + i) - (a + 2 * d + g)) / (8 * cell_size_m)
            dzdy = ((g + 2 * h + i) - (a + 2 * b + cc)) / (8 * cell_size_m)
            srow.append(math.degrees(math.atan(math.hypot(dzdx, dzdy))))
            # Downslope direction, clockwise from north (row index increases southwards).
            if dzdx == 0 and dzdy == 0:
                arow.append(-1.0)  # flat
            else:
                arow.append((math.degrees(math.atan2(-dzdx, dzdy)) + 360.0) % 360.0)
        slopes.append(srow)
        aspects.append(arow)
    return slopes, aspects


def aspect_name(aspect_deg: float) -> str:
    if aspect_deg < 0:
        return "flat"
    names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return names[int(((aspect_deg + 22.5) % 360) // 45)]
