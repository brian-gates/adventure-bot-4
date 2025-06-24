# Dice Rendering Pipeline Requirements

**For quickstart, CLI usage, and user-facing instructions, see
[media/dice/README.md](media/dice/README.md).**

This file is the single source of truth for requirements, design rationale, and
implementation notes for the dice rendering pipeline. Keep it updated as the
implementation evolves.

## Goal

Generate PNG images for every face of standard polyhedral dice sets (d4, d6, d8,
d12, d20). Images are used by the game engine as UI assets.

## Dice to Render

- **d4** – values 1-4 ➜ 4 images
- **d6** – values 1-6 ➜ 6 images
- **d8** – values 1-8 ➜ 8 images
- **d12** – values 1-12 ➜ 12 images
- **d20** – values 1-20 ➜ 20 images

_Total output: 50 images._

## Directory Layout

```
media/
└─ dice/
   ├─ d4/   1.png … 4.png
   ├─ d6/   1.png … 6.png
   ├─ d8/   1.png … 8.png
   ├─ d12/  1.png … 12.png
   └─ d20/  1.png … 20.png
```

## Blender Automation

Two Python scripts executed via the Blender CLI:

1. **setup-dice-scene.py** (idempotent)
   - Clears the scene and re-creates:
     - Sun light
     - Orthographic camera (parenting an empty as text anchor)
     - PBR material for dice body (`DieMat`).
     - Emissive text material (`TextMat`) with emission node explicitly named
       **`EmissiveNumber`** (required by renderer).
     - Polyhedral meshes for **d4, d6, d8, d12, d20** using
       `bpy.ops.mesh.primitive_solid_add`. Each die is:
       - Added at the origin, rotated to a pleasing angle `(0.6, 0, 0.8)`.
       - Assigned `DieMat`.
       - Hidden (`hide_render` & `hide_viewport` set `True`) — renderer will
         un-hide per iteration.
     - Text object (`DieText`) parented to camera anchor, origin set to
       geometry, uses `TextMat`.
     - Saves changes back to the working `.blend` file
       (`bpy.ops.wm.save_as_mainfile`).

2. **render-all-dice.py**
   - Loads the prepared `.blend` file.
   - Configuration dictionary:
     ```python
     DICE_CONFIG = {
         "d4":  4,
         "d6":  6,
         "d8":  8,
         "d12": 12,
         "d20": 20,
     }
     ```
   - Looks up `TEXT_OBJECT_NAME = "DieText"` and `EmissiveNumber` node.
   - For **each die**:
     1. Un-hides the die mesh.
     2. Loops through values `1 … max_value`.
     3. Sets `text_obj.data.body = str(i)`.
     4. Optionally adjusts emission colour (HSV ramp → RGB) for visual variety.
     5. Sets `scene.render.filepath = f"<output_dir>/{i}.png"` and calls
        `bpy.ops.render.render(write_still=True)`.
     6. Re-hides the die before moving to the next one.
   - Restores original `scene.render.filepath` at the end.

## Command-Line Execution

Run from repository root (or `media/dice`) :

```bash
# 1. Build / update the blend file
blender --background --python setup-dice-scene.py

# 2. Render all dice faces
blender dice.blend --background --python render-all-dice.py
```

Both scripts are designed to be repeatable; re-running will overwrite existing
PNGs.

## Open Tasks

- [x] Update `setup-dice-scene.py` to include **d12** generation.
- [x] Extend `render-all-dice.py` → add `d12` to `DICE_CONFIG`.
- [ ] (Optional) Add CLI wrapper `generate-dice-assets.sh` that runs both steps
      with a single command.
- [ ] Verify font at `FONT_PATH` loads on CI/other machines; bundle fallback if
      necessary.
- [ ] Confirm gamma/colour-management settings match the rest of the UI assets.

## Visual Feedback Requirement

Letter colour should encode roll magnitude per die:

- **Hue mapping**: linear HSV hue from **0.0 → 0.33** (red → green).
  - Lowest face (e.g. 1) = hue 0 = **red**.
  - Highest face (e.g. 20) = hue 0.33 ≈ **green**.
- Full saturation/value (HSV `s=1`, `v=1`).
- Emission strength ≈ 10 for clear glow against dark die material.

The implementation now lives in `render-all-dice.py` – adjust the hue formula if
artistic tweaks are required.

---
