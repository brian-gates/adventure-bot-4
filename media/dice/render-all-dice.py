import bpy
import os
import colorsys
import sys

# Add script directory to path for dice_config import
script_dir = os.path.dirname(__file__)
if script_dir not in sys.path:
    sys.path.append(script_dir)

import dice_config as dc

# --- Configuration ---
SCENE_NAME = "Scene"
TEXT_OBJECT_NAME = "DieText"
DICE_CONFIG = dc.DICE_CONFIG
# --- End Configuration ---


def set_hue_for_value(emission_node, i: int, max_value: int):
    """Map 1..max_value to hue 0 (red) .. 0.33 (green)."""
    hue = 0.33 * (i - 1) / max(1, max_value - 1)
    rgb = colorsys.hsv_to_rgb(hue, 1, 1)
    emission_node.inputs['Color'].default_value = (*rgb, 1)
    emission_node.inputs['Strength'].default_value = 10.0


def render_all_dice():
    print("\n--- Starting Dice Rendering ---")
    scene = bpy.context.scene

    # Base path for output, relative to the blend file
    output_path = os.path.dirname(bpy.data.filepath)

    # Locate text object
    text_obj = bpy.data.objects.get(TEXT_OBJECT_NAME)
    if text_obj is None:
        print(f"[render] ERROR: Text object '{TEXT_OBJECT_NAME}' not found – aborting batch.")
        return

    try:
        emission_node = text_obj.active_material.node_tree.nodes["EmissiveNumber"]
    except Exception:
        print("[render] ERROR: 'EmissiveNumber' node missing – aborting batch.")
        return

    # Hide all dice meshes to start
    for die_name in DICE_CONFIG:
        obj = bpy.data.objects.get(die_name)
        if obj:
            obj.hide_render = True
            obj.hide_viewport = True

    # Render loop
    for die_name, cfg in DICE_CONFIG.items():
        die_obj = bpy.data.objects.get(die_name)
        if not die_obj:
            print(f"[render] WARNING: Die object '{die_name}' not found. Skipping.")
            continue

        die_obj.hide_render = False
        die_obj.location = (0, 0, 0)

        die_output_path = os.path.join(output_path, die_name)
        os.makedirs(die_output_path, exist_ok=True)

        max_val = cfg["max"]
        for i in range(1, max_val + 1):
            text_obj.data.body = str(i)
            set_hue_for_value(emission_node, i, max_val)

            scene.render.filepath = os.path.join(die_output_path, f"{i}.png")
            try:
                bpy.ops.render.render(write_still=True)
            except Exception as e:
                print(f"[render] ERROR rendering {die_name} {i}: {e}")
                continue

        die_obj.hide_render = True

    scene.render.filepath = output_path  # Reset
    print("\n--- All dice rendered successfully! ---")


if __name__ == "__main__":
    render_all_dice() 