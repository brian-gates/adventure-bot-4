import bpy

# This script prepares the .blend file for rendering.
# It should only need to be run once.

SCENE_NAME = "Scene"
TEXT_OBJECT_NAME = "DieText"
CAMERA_NAME = "Camera"

def setup_dice_material():
    """Creates a procedural marble material for the dice."""
    print("Creating procedural marble material for dice...")
    mat = bpy.data.materials.new(name="DiceMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")

    # Set base material properties for a polished look
    bsdf.inputs['Metallic'].default_value = 0.2
    bsdf.inputs['Roughness'].default_value = 0.3

    # Create a Noise Texture node for distortion - lower values for less detail
    noise_texture = nodes.new(type='ShaderNodeTexNoise')
    noise_texture.inputs['Scale'].default_value = 2.0
    noise_texture.inputs['Detail'].default_value = 4.0
    noise_texture.inputs['Roughness'].default_value = 0.5
    noise_texture.location = (-600, 300)

    # Create a Wave Texture node for the marble bands - lower values for less detail
    wave_texture = nodes.new(type='ShaderNodeTexWave')
    wave_texture.inputs['Scale'].default_value = 1.0
    wave_texture.inputs['Distortion'].default_value = 3.0
    wave_texture.location = (-400, 300)
    
    # Link Noise to Wave texture to create swirls
    mat.node_tree.links.new(noise_texture.outputs['Color'], wave_texture.inputs['Vector'])

    # Create a Color Ramp to define the marble colors (black and white)
    color_ramp = nodes.new(type='ShaderNodeValToRGB')
    color_ramp.location = (-200, 300)
    color_ramp.color_ramp.elements[0].color = (0.05, 0.05, 0.05, 1) # Dark gray
    color_ramp.color_ramp.elements[1].color = (0.8, 0.8, 0.8, 1) # Light gray
    
    # Link Wave texture to Color Ramp
    mat.node_tree.links.new(wave_texture.outputs['Color'], color_ramp.inputs['Fac'])
    
    # Link Color Ramp to the Base Color of the BSDF
    mat.node_tree.links.new(color_ramp.outputs['Color'], bsdf.inputs['Base Color'])
    
    return mat

def setup_scene():
    """Configures the Blender scene from scratch and saves the file."""
    print("--- Starting Scene Setup ---")

    # 1. Set Renderer to Eevee
    print("Setting renderer to Eevee...")
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.use_bloom = True
    scene.render.film_transparent = True

    # 2. Enable Extra Objects Add-on
    print("Enabling 'Add Mesh: Extra Objects' add-on...")
    bpy.ops.preferences.addon_enable(module="add_mesh_extra_objects")

    # 3. Clear Existing Objects
    print("Clearing existing mesh and text objects...")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete() 

    # 4. Create Dice Material
    dice_mat = setup_dice_material()

    # 5. Add Dice Models
    print("Adding dice models...")
    dice_to_create = {"d4": "4", "d6": "6", "d8": "8", "d20": "20"}
    for name, sides in dice_to_create.items():
        print(f"  - Adding {name}")
        bpy.ops.mesh.primitive_solid_add(source=sides)
        obj = bpy.context.active_object
        obj.name = name
        obj.data.materials.append(dice_mat)
        
        # Apply bevel modifier for softer edges
        bevel_mod = obj.modifiers.new(name='Bevel', type='BEVEL')
        bevel_mod.width = 0.05
        bevel_mod.segments = 3
        bpy.ops.object.shade_smooth() # Smooth the shading for a polished look
        
        # Hide all dice initially by moving them away
        obj.location = (100, 100, 100)

    # 6. Add and Configure Text Object
    print("Adding and configuring text object...")
    bpy.ops.object.text_add(location=(0, 0, 0))
    text_obj = bpy.context.object
    text_obj.name = TEXT_OBJECT_NAME
    text_obj.data.body = "20"
    text_obj.data.size = 0.8
    text_obj.data.align_x = 'CENTER'
    text_obj.data.align_y = 'CENTER'
    text_obj.data.extrude = 0.05
    
    # 7. Create a single, advanced material for the text with a shader-based outline
    print("Creating advanced text material with shader outline...")
    text_mat = bpy.data.materials.new(name="TextMaterial")
    text_mat.use_nodes = True
    text_obj.data.materials.append(text_mat)
    
    nodes = text_mat.node_tree.nodes
    nodes.clear()
    
    # Create the node setup
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    mix_shader = nodes.new(type='ShaderNodeMixShader')
    
    # Outline shader (black)
    outline_shader = nodes.new(type='ShaderNodeBsdfPrincipled')
    outline_shader.inputs['Base Color'].default_value = (0, 0, 0, 1)
    outline_shader.inputs['Roughness'].default_value = 1.0
    
    # Number face shader (emissive)
    emission_shader = nodes.new(type='ShaderNodeEmission')
    emission_shader.name = "EmissiveNumber" # Name this node so the render script can find it
    
    # Edge detection logic
    layer_weight = nodes.new(type='ShaderNodeLayerWeight')
    layer_weight.inputs['Blend'].default_value = 0.3 # Controls outline thickness
    
    color_ramp = nodes.new(type='ShaderNodeValToRGB')
    color_ramp.color_ramp.elements[0].position = 0.9 # Controls outline sharpness
    color_ramp.color_ramp.elements[1].position = 1.0
    
    # Link the nodes
    links = text_mat.node_tree.links
    links.new(layer_weight.outputs['Facing'], color_ramp.inputs['Fac'])
    links.new(color_ramp.outputs['Color'], mix_shader.inputs['Fac'])
    links.new(outline_shader.outputs['BSDF'], mix_shader.inputs[1])
    links.new(emission_shader.outputs['Emission'], mix_shader.inputs[2])
    links.new(mix_shader.outputs['Shader'], output_node.inputs['Surface'])

    # 8. Setup Camera, Lights, and Constraints
    print("Setting up camera and lights...")
    bpy.ops.object.camera_add(location=(0, -6, 4))
    camera = bpy.context.object
    camera.name = CAMERA_NAME
    scene.camera = camera
    
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    target_empty = bpy.context.object
    target_empty.name = "CameraTarget"

    # Constrain camera to look at the target
    cam_constraint = camera.constraints.new(type='TRACK_TO')
    cam_constraint.target = target_empty
    cam_constraint.track_axis = 'TRACK_NEGATIVE_Z'
    cam_constraint.up_axis = 'UP_Y'

    # Constrain text to always face the camera
    print("Adding constraint to text to always face camera...")
    text_constraint = text_obj.constraints.new(type='TRACK_TO')
    text_constraint.target = camera
    text_constraint.track_axis = 'TRACK_Z'
    text_constraint.up_axis = 'UP_Y'

    # Add lights
    bpy.ops.object.light_add(type='AREA', location=(-4, -1, 3))
    key_light = bpy.context.object
    key_light.data.energy = 500
    bpy.ops.object.light_add(type='AREA', location=(4, 1, 3))
    fill_light = bpy.context.object
    fill_light.data.energy = 250

    # 9. Set a default active object
    bpy.context.view_layer.objects.active = scene.objects["d20"]
    scene.objects["d20"].location = (0,0,0)

    print("--- Scene setup complete. Saving file. ---")
    bpy.ops.wm.save_mainfile()

if __name__ == "__main__":
    setup_scene() 