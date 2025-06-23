import bpy
import os
import sys

# Ensure this script directory is on path so we can import dice_config
script_dir = os.path.dirname(__file__)
if script_dir not in sys.path:
    sys.path.append(script_dir)

import dice_config as dc

# --- Configuration ---
TEXT_OBJECT_NAME = "DieText"
FONT_PATH = "//../MedievalSharp-Regular.ttf"
DICE_CONFIG = dc.DICE_CONFIG

def clear_scene():
    """Deletes all objects in the scene."""
    if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def setup_basic_scene():
    """
    Creates a flat, planar scene for rendering a number on a die.
    """
    print("--- Setting up a basic planar scene ---")

    # Ensure the required addon is enabled
    if "add_mesh_extra_objects" not in bpy.context.preferences.addons:
        try:
            bpy.ops.wm.addon_enable(module="add_mesh_extra_objects")
        except Exception as e:
            print(f"[setup] ERROR: Extra Objects add-on not available: {e}")
            return  # abort early – cannot create dice meshes

    # 1. Add a simple, direct light
    print("Adding light...")
    bpy.ops.object.light_add(type='SUN', location=(0, -10, 0), rotation=(0, 0, 0))

    # 2. Add an orthographic camera
    print("Adding orthographic camera...")
    bpy.ops.object.camera_add(location=(0, -10, 0), rotation=(0, 0, 0))
    camera_obj = bpy.context.object
    camera_obj.data.type = 'ORTHO'
    camera_obj.data.ortho_scale = 3.0 # Controls the "zoom" level
    bpy.context.scene.camera = camera_obj

    # 3. Create materials
    print("Creating materials...")
    # Dark material for the die
    die_mat = bpy.data.materials.new(name="DieMat")
    die_mat.use_nodes = True
    die_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1)
    
    # White emissive material for the text
    text_mat = bpy.data.materials.new(name="TextMat")
    text_mat.use_nodes = True
    
    nodes = text_mat.node_tree.nodes
    nodes.clear()
    emission_shader = nodes.new(type='ShaderNodeEmission')
    emission_shader.name = "EmissiveNumber"
    emission_shader.inputs['Color'].default_value = (1, 1, 1, 1)
    emission_shader.inputs['Strength'].default_value = 5.0
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    text_mat.node_tree.links.new(emission_shader.outputs['Emission'], output_node.inputs['Surface'])
    
    # 4. Add all required dice models
    print("Adding and configuring dice...")
    for die_name, cfg in DICE_CONFIG.items():
        solid = cfg["solid"]
        try:
            bpy.ops.mesh.primitive_solid_add(source=solid, radius=1.5)
        except Exception as e:
            print(f"[setup] Failed to create {die_name} ({solid}): {e}")
            continue

        die_obj = bpy.context.object
        die_obj.name = die_name
        die_obj.rotation_euler = cfg["rot"]
        die_obj.data.materials.append(die_mat)

        # Hide by default – renderer will toggle
        die_obj.hide_render = True
        die_obj.hide_viewport = True
        print(f"  - Created and hid '{die_name}'")
    
    # 5. Create a text anchor parented to the camera
    print("Adding text anchor...")
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    text_anchor = bpy.context.object
    text_anchor.name = "TextAnchor"
    text_anchor.parent = camera_obj
    text_anchor.location = (0, 0, -1) # Center the anchor in the flat view

    # 6. Add the text object and constrain it to the anchor
    print("Adding text and constraints...")
    try:
        font = bpy.data.fonts.load(FONT_PATH)
    except RuntimeError:
        print(f"Error: Font not found at path '{FONT_PATH}'. Aborting.")
        return
        
    bpy.ops.object.text_add(location=(0, -0.1, 0))
    text_obj = bpy.context.object
    text_obj.name = TEXT_OBJECT_NAME
    text_obj.data.body = "20"
    text_obj.data.font = font
    text_obj.data.size = 0.4
    text_obj.data.align_x = 'CENTER'
    text_obj.data.align_y = 'CENTER'
    text_obj.data.materials.append(text_mat)
    bpy.ops.object.select_all(action='DESELECT')

    # Set the object's origin to its geometric center to ensure accurate positioning
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    # Constrain text to the anchor and camera
    loc_constraint = text_obj.constraints.new(type='COPY_LOCATION')
    loc_constraint.target = text_anchor
    
    rot_constraint = text_obj.constraints.new(type='COPY_ROTATION')
    rot_constraint.target = camera_obj

    print("--- Basic scene setup complete! ---")

# --- Main Execution ---
if __name__ == "__main__":
    clear_scene()
    setup_basic_scene()
    
    # Save the changes to the .blend file. This is the critical missing step.
    print("Saving the updated .blend file...")
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath) 