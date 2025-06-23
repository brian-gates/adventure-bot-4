import bpy
import os
import colorsys

# --- Configuration ---
SCENE_NAME = "Scene"
TEXT_OBJECT_NAME = "DieText"
DICE_CONFIG = {
    "d4": {"max_value": 4},
    "d6": {"max_value": 6},
    "d8": {"max_value": 8},
    "d20": {"max_value": 20},
}
# --- End Configuration ---

def render_all_dice():
    """Renders all permutations for every configured die."""
    print("\n--- Starting Dice Rendering ---")
    scene = bpy.context.scene
    
    # Base path for output, relative to the blend file
    output_path = os.path.dirname(bpy.data.filepath)

    # --- Find objects and materials ---
    try:
        text_obj = bpy.data.objects['DieText']
        text_mat = bpy.data.materials['TextMaterial']
        emission_node = text_mat.node_tree.nodes["EmissiveNumber"]
    except KeyError as e:
        print(f"Error: Could not find required object or material: {e}")
        return
        
    # Hide all dice models by default
    for die_name in DICE_CONFIG.keys():
        if die_name in bpy.data.objects:
            bpy.data.objects[die_name].hide_render = True
            bpy.data.objects[die_name].location = (100, 100, 100)

    # --- Loop through dice and render ---
    for die_name, config in DICE_CONFIG.items():
        print(f"--- Processing: {die_name} ---")
        
        die_obj = bpy.data.objects.get(die_name)
        if not die_obj:
            print(f"Warning: Die object '{die_name}' not found. Skipping.")
            continue

        # Make only the current die visible for rendering
        die_obj.hide_render = False
        die_obj.location = (0, 0, 0)

        # Create output directory
        die_output_path = os.path.join(output_path, die_name)
        os.makedirs(die_output_path, exist_ok=True)

        # Loop through each possible value for the die
        for i in range(1, config['max_value'] + 1):
            print(f"  Rendering value: {i}")

            text_obj.data.body = str(i)

            hue = 0.33 * ((i - 1) / max(1, config['max_value'] - 1))
            
            emission_node.inputs['Color'].default_value = (*colorsys.hsv_to_rgb(hue, 1, 1), 1)
            emission_node.inputs['Strength'].default_value = 10.0

            scene.render.filepath = os.path.join(die_output_path, f"{i}.png")
            bpy.ops.render.render(write_still=True)
            
        die_obj.hide_render = True
        die_obj.location = (100, 100, 100)

    print("\n--- All dice rendered successfully! ---")

if __name__ == "__main__":
    render_all_dice() 