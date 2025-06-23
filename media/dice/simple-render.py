import bpy
import os

def simple_render():
    """
    A very basic render script to ensure the number is visible.
    It renders a single frame of the d20 with the number '20'.
    """
    print("--- Starting Simple Render ---")
    scene = bpy.context.scene
    
    # Define the output path
    output_dir = os.path.dirname(bpy.data.filepath)
    output_file_path = os.path.join(output_dir, "test-render.png")
    
    # Set render settings
    scene.render.filepath = output_file_path
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True
    
    # --- Just render! The setup script did all the work. ---
    print(f"Rendering to {output_file_path}...")
    bpy.ops.render.render(write_still=True)
    print("--- Simple Render Complete ---")


# --- Main Execution ---
if __name__ == "__main__":
    simple_render() 