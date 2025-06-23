import math

"""Shared constants for dice generation & rendering."""

# Max face values per die
DICE_MAX = {
    "d4": 4,
    "d6": 6,
    "d8": 8,
    "d12": 12,
    "d20": 20,
}

# Map die -> primitive solid type string used by add_mesh_extra_objects
SOLID_MAP = {
    "d4": "4",   # Tetrahedron
    "d6": "6",   # Cube
    "d8": "8",   # Octahedron
    "d12": "12", # Dodecahedron
    "d20": "20", # Icosahedron
}

# Default rotation so the uppermost face is visible in orthographic camera
ROTATION_MAP = {
    "d4":  (math.radians(90), 0, 0),  # point-up so we read one face
    "d6":  (0.6, 0, 0.8),
    "d8":  (0.6, 0, 0.8),
    "d12": (0.6, 0, 0.8),
    "d20": (0.6, 0, 0.8),
}

# Convenience unified structure
DICE_CONFIG = {
    name: {"max": DICE_MAX[name], "solid": SOLID_MAP[name], "rot": ROTATION_MAP[name]}
    for name in DICE_MAX
} 