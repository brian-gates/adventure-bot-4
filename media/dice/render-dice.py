import importlib
import os
import bpy
import sys
import colorsys
import math

script_dir = os.path.dirname(__file__)
if script_dir not in sys.path:
    sys.path.append(script_dir)

"""Dice configuration for generation & rendering."""
DICE_CONFIG = {
    "d4": {
        "solid": "4",
        "max": 4,
        "rotation": (math.radians(90), 0, 0),
        "offset": (0, 0, 0),
        "scale": 0.8,
    },
    "d6": {
        "solid": "6",
        "max": 6,
        "rotation": (0, 0, 0), 
        "offset": (0, 0, 0),
        "scale": 1.0,
    },
    "d8": {
        "solid": "8",
        "max": 8,
        "rotation": (0, 0, 0),
        "offset": (0, 0, 0),
        "scale": 0.8,
    },
    "d12": {
        "solid": "12",
        "max": 12,
        "rotation": (0, 0, math.radians(60)),
        "offset": (0, 0, 0),
        "scale": 0.7,
    },
    "d20": {
        "solid": "20",
        "max": 20,
        "rotation": (0, math.radians(32), math.radians(20)),
        "offset": (0, 0, 0),
        "scale": 0.8,
    },
}

# --- Configuration ---
SCENE_NAME = "Scene"
TEXT_OBJECT_NAME = "DieText"
FONT_PATH = os.path.abspath(os.path.join(script_dir, "../MedievalSharp-Regular.ttf"))
# --- End Configuration ---

# Parse command-line arguments after '--'
args = sys.argv
if '--' in args:
    idx = args.index('--')
    user_args = args[idx + 1:]
else:
    user_args = []

die_filter = None
face_filter = None

if len(user_args) >= 1:
    die_filter = user_args[0]
if len(user_args) >= 2:
    try:
        face_filter = int(user_args[1])
    except ValueError:
        face_filter = None

def clear_scene():
    if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def setup_scene(script_dir):
    print("--- Setting up dice scene ---")
    clear_scene()
    # Remove all existing lights
    for obj in list(bpy.data.objects):
        if obj.type == 'LIGHT':
            bpy.data.objects.remove(obj, do_unlink=True)
    # Key area light (warm)
    bpy.ops.object.light_add(type='AREA', location=(3, -6, 6))
    key_light = bpy.context.object
    key_light.data.energy = 500
    key_light.data.size = 3
    key_light.data.color = (1.0, 0.85, 0.7)
    # Fill area light (cool)
    bpy.ops.object.light_add(type='AREA', location=(-4, -2, 4))
    fill_light = bpy.context.object
    fill_light.data.energy = 200
    fill_light.data.size = 2
    fill_light.data.color = (0.7, 0.85, 1.0)
    # Rim area light (white)
    bpy.ops.object.light_add(type='AREA', location=(0, 6, 7))
    rim_light = bpy.context.object
    rim_light.data.energy = 300
    rim_light.data.size = 2
    rim_light.data.color = (1.0, 1.0, 1.0)
    # Camera
    bpy.ops.object.camera_add(location=(0, -10, 0), rotation=(0, 0, 0))
    camera_obj = bpy.context.object
    camera_obj.data.type = 'ORTHO'
    camera_obj.data.ortho_scale = 1.75
    bpy.context.scene.camera = camera_obj
    import math
    camera_obj.rotation_euler = (math.radians(90), 0, 0)
    
    # Set up render settings for transparency
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.resolution_x = 2048
    bpy.context.scene.render.resolution_y = 2048
    
    # Materials
    die_mat = bpy.data.materials.new(name="DieMat")
    die_mat.use_nodes = True
    die_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1)
    text_mat = bpy.data.materials.new(name="TextMat")
    text_mat.use_nodes = True
    nodes = text_mat.node_tree.nodes
    nodes.clear()
    emission_shader = nodes.new(type='ShaderNodeEmission')
    emission_shader.name = "EmissiveNumber"
    emission_shader.inputs['Color'].default_value = (1, 1, 1, 1)
    emission_shader.inputs['Strength'].default_value = 1.0
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    text_mat.node_tree.links.new(emission_shader.outputs['Emission'], output_node.inputs['Surface'])
    # Dice meshes
    for die_name, cfg in DICE_CONFIG.items():
        solid = cfg["solid"]
        try:
            bpy.ops.mesh.primitive_solid_add(source=solid, size=1.05)
            die_obj = bpy.context.object
            die_obj.name = die_name
            die_obj.rotation_euler = cfg["rotation"]
            die_obj.data.materials.append(die_mat)
            # Apply smooth shading
            bpy.ops.object.shade_smooth()
            # Add bevel modifier
            bevel = die_obj.modifiers.new(name="Bevel", type='BEVEL')
            bevel.width = 0.05
            bevel.segments = 5
            bevel.profile = 0.7
            if die_obj.type == 'MESH' and hasattr(die_obj.data, 'vertices'):
                vcount = len(die_obj.data.vertices)
                if vcount == 0:
                    print(f"[setup] WARNING: '{die_name}' mesh has ZERO vertices after creation!")
                else:
                    print(f"  - Created '{die_name}' with {vcount} vertices")
            else:
                print(f"[setup] WARNING: '{die_name}' is not a mesh or has no vertices attribute!")
            # Don't hide dice initially - we'll manage visibility during rendering
            die_obj.hide_render = False
            die_obj.hide_viewport = False
            if "offset" in cfg:
                die_obj.location = cfg["offset"]
            if "scale" in cfg:
                die_obj.scale = (cfg["scale"], cfg["scale"], cfg["scale"])
        except Exception as e:
            print(f"[setup] Failed to create {die_name} ({solid}): {e}")
            print("[setup] Make sure 'Add Mesh: Extra Objects' add-on is enabled in Blender preferences")
            continue
    # Text anchor
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    text_anchor = bpy.context.object
    text_anchor.name = "TextAnchor"
    text_anchor.parent = camera_obj
    text_anchor.location = (0, 0, -1)
    # Text object
    try:
        font = bpy.data.fonts.load(FONT_PATH)
    except RuntimeError:
        print(f"Error: Font not found at path '{FONT_PATH}'. Aborting.")
        return False
    bpy.ops.object.text_add(location=(0, -0.1, 0))
    text_obj = bpy.context.object
    text_obj.name = TEXT_OBJECT_NAME
    text_obj.data.body = "20"
    text_obj.data.font = font
    text_obj.data.size = 1.5
    text_obj.data.align_x = 'CENTER'
    text_obj.data.align_y = 'CENTER'
    text_obj.data.materials.append(text_mat)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    loc_constraint = text_obj.constraints.new(type='COPY_LOCATION')
    loc_constraint.target = text_anchor
    rot_constraint = text_obj.constraints.new(type='COPY_ROTATION')
    rot_constraint.target = camera_obj
    print("--- Dice scene setup complete! ---")
    return True

def render_all_dice(script_dir):
    if not setup_scene(script_dir):
        print("[render] Scene setup failed. Aborting.")
        return
    
    print("--- Starting dice rendering ---")
    
    # Get the text object
    text_obj = bpy.data.objects.get(TEXT_OBJECT_NAME)
    if not text_obj:
        print("[render] Text object not found. Aborting.")
        return
    
    # Add a single point light at the text position for number glow
    light_data = bpy.data.lights.new(name="NumberLight", type='POINT')
    light_data.energy = 20  # Lowered for visible color
    light_obj = bpy.data.objects.new(name="NumberLight", object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = text_obj.location
    
    # Create output directory
    output_dir = os.path.join(script_dir, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    # Get the emission shader node for text color
    emission_shader = None
    for node in text_obj.data.materials[0].node_tree.nodes:
        if node.type == 'EMISSION':
            emission_shader = node
            break
    if emission_shader is None:
        print("[render] Emission shader not found for text material. Aborting.")
        return
    
    # Render each die
    for die_name, cfg in DICE_CONFIG.items():
        if die_filter and die_name != die_filter:
            continue
            
        die_obj = bpy.data.objects.get(die_name)
        if not die_obj:
            print(f"[render] Die object '{die_name}' not found. Skipping.")
            continue
        
        print(f"Rendering {die_name}...")
        
        # Show this die, hide others
        for other_die_name in DICE_CONFIG.keys():
            other_die = bpy.data.objects.get(other_die_name)
            if other_die:
                if other_die_name == die_name:
                    # Show the current die
                    other_die.hide_render = False
                    other_die.hide_viewport = False
                else:
                    # Hide other dice
                    other_die.hide_render = True
                    other_die.hide_viewport = True
        
        # Render each face
        for face_num in range(1, cfg["max"] + 1):
            if face_filter and face_num != face_filter:
                continue
            # Set text content
            text_obj.data.body = str(face_num)
            # Calculate color from red to green
            t = (face_num - 1) / (cfg["max"] - 1) if cfg["max"] > 1 else 0
            color = (1 - t, t, 0, 1)  # RGBA
            emission_shader.inputs['Color'].default_value = color
            # Set the light color to match the number color (RGB only)
            light_obj.data.color = color[:3]
            # Set render output path
            output_path = os.path.join(output_dir, f"{die_name}_{face_num}.png")
            bpy.context.scene.render.filepath = output_path
            # Render
            print(f"  Rendering face {face_num}...")
            bpy.ops.render.render(write_still=True)
            if os.path.exists(output_path):
                print(f"    Saved: {output_path}")
            else:
                print(f"    ERROR: Failed to save {output_path}")
    
    print("--- Dice rendering complete! ---")

if __name__ == "__main__":
    render_all_dice(script_dir) 