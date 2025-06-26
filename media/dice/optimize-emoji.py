#!/usr/bin/env python3
"""
Script to optimize dice images for emoji use.
Resizes images to be smaller and more suitable for Discord emojis.
"""

import os
import sys
from PIL import Image

def optimize_for_emoji(input_path, output_path, size=(128, 128)):
    """
    Optimize an image for emoji use by resizing and optimizing.
    
    Args:
        input_path: Path to the input image
        output_path: Path to save the optimized image
        size: Target size as (width, height) tuple
    """
    try:
        # Open the image
        with Image.open(input_path) as img:
            # Convert to RGBA if not already
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Resize the image
            img_resized = img.resize(size, Image.Resampling.LANCZOS)
            
            # Save with optimization
            img_resized.save(output_path, 'PNG', optimize=True, compress_level=9)
            
            print(f"Optimized: {input_path} -> {output_path}")
            
    except Exception as e:
        print(f"Error optimizing {input_path}: {e}")

def main():
    # Input and output directories
    input_dir = "output"
    output_dir = "emoji"
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Process d10 images
    for i in range(1, 11):
        input_file = os.path.join(input_dir, f"d10_{i}.png")
        output_file = os.path.join(output_dir, f"d10_{i}.png")
        
        if os.path.exists(input_file):
            optimize_for_emoji(input_file, output_file)
        else:
            print(f"Warning: {input_file} not found")

if __name__ == "__main__":
    main() 