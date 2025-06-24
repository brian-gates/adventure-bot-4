# Dice Rendering Pipeline: Quickstart & Usage

This README covers how to generate PNG images for all faces of standard
polyhedral dice (d4, d6, d8, d12, d20) for use as UI assets.

For technical requirements and design rationale, see
[../../dice-rendering-requirements.md](../../dice-rendering-requirements.md).

---

## Prerequisites

- Blender 3.x or later (tested with 4.x)
- The "Add Mesh: Extra Objects" add-on (auto-installed by the setup script)
- Font: `media/MedievalSharp-Regular.ttf` (bundled)

## Setup: Prepare the .blend File

From the project root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python media/dice/setup-dice-scene.py
```

This will create/update `media/dice/dice.blend` with all dice, materials, text,
and lighting.

## Rendering Dice Assets

To render all dice faces in bulk:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python media/dice/render-dice.py
```

To render only a specific die (e.g., d20):

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python media/dice/render-dice.py -- d20
```

To render only a specific face (e.g., d20 face 20):

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python media/dice/render-dice.py -- d20 20
```

The script will set up the scene, lighting, dice, and text automatically. No
separate setup step is needed.

- Output images are saved in `media/dice/<die>/<face>.png`.
- Re-running will overwrite existing PNGs.

## Notes

- The old `simple-render.py` script is no longer needed; use the argument-based
  bulk renderer for all testing and iteration.
- For requirements, implementation details, and open tasks, see
  [../../dice-rendering-requirements.md](../../dice-rendering-requirements.md).
