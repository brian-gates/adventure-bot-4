# Dice Rendering Pipeline Requirements

**For quickstart, CLI usage, and user-facing instructions, see
[media/dice/README.md](media/dice/README.md).**

This file is the single source of truth for requirements, design rationale, and
implementation notes for the dice rendering pipeline. Keep it updated as the
implementation evolves.

## Goal

Generate PNG images for every face of standard polyhedral dice sets (d4, d6, d8,
d10, d12, d20). Images are used by the game engine as UI assets.

## Dice to Render

- **d4** – values 1-4 ➜ 4 images
- **d6** – values 1-6 ➜ 6 images
- **d8** – values 1-8 ➜ 8 images
- **d10** – values 1-10 ➜ 10 images
- **d12** – values 1-12 ➜ 12 images
- **d20** – values 1-20 ➜ 20 images

_Total output: 60 images._

## Directory Layout

```
media/
└─ dice/
   ├─ d4/   1.png … 4.png
   ├─ d6/   1.png … 6.png
   ├─ d8/   1.png … 8.png
   ├─ d10/  1.png … 10.png
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
     - Polyhedral meshes for **d4, d6, d8, d10, d12, d20**:
       - **d4, d6, d8, d12, d20**: Using `bpy.ops.mesh.primitive_solid_add` from
         the "Add Mesh: Extra Objects" add-on
       - **d10**: Using custom mathematical mesh generation (pentagonal
         trapezohedron) since the add-on doesn't support d10 dice
     - Each die is:
       - Added at the origin, rotated to a pleasing angle.
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
         "d10": 10,
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

## d10 Mathematical Mesh Generation

The d10 (pentagonal trapezohedron) is mathematically generated using the
following approach:

1. **Geometry**: A d10 is created by taking two pentagonal pyramids and rotating
   one by 36 degrees (360°/10) and joining them at their bases.

2. **Implementation**: The `create_d10_mesh()` function in `render-dice.py`:
   - Creates vertices for two pentagonal bases (top and bottom)
   - Rotates the bottom base by 36° relative to the top
   - Creates apex vertices for both pyramids
   - Generates triangular faces for the pyramid sides
   - Creates quadrilateral faces connecting the bases
   - Applies smooth shading and bevel modifiers

3. **Result**: A mathematically accurate d10 with 12 vertices and 10 faces,
   properly oriented for rendering.

## Emoji Optimization

After rendering, dice images are optimized for emoji use:

- **Script**: `optimize-emoji.py` resizes images to 128x128 pixels
- **Format**: PNG with maximum compression
- **Target size**: 6-10KB per image (suitable for Discord emoji limits)
- **Location**: `media/dice/emoji/` directory

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
