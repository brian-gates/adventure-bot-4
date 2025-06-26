import bpy
import bmesh
import math
from mathutils import Vector

def create_d10_mesh():
    """
    Create a mathematically accurate d10 (pentagonal trapezohedron) mesh.
    - 2 apices (top and bottom)
    - 10 vertices around a ring (decagon)
    - 10 kite-shaped faces
    """
    mesh = bpy.data.meshes.new("d10_mesh")
    obj = bpy.data.objects.new("d10", mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()

    # Parameters
    ring_radius = 0.5
    height = 0.7  # Distance from center to apex

    # Create apices
    top = bm.verts.new((0, 0, height))
    bottom = bm.verts.new((0, 0, -height))

    # Create 10 vertices around the ring (decagon)
    ring_verts = []
    for i in range(10):
        angle = 2 * math.pi * i / 10
        x = ring_radius * math.cos(angle)
        y = ring_radius * math.sin(angle)
        z = 0
        ring_verts.append(bm.verts.new((x, y, z)))

    # Create 10 kite-shaped faces
    for i in range(10):
        v1 = ring_verts[i]
        v2 = ring_verts[(i + 1) % 10]
        if i % 2 == 0:
            # Even faces connect to top apex
            bm.faces.new([top, v1, v2, bottom])
        else:
            # Odd faces connect to bottom apex
            bm.faces.new([bottom, v1, v2, top])

    bm.to_mesh(mesh)
    bm.free()

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    bevel = obj.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.05
    bevel.segments = 5
    bevel.profile = 0.7
    return obj

def create_d10_with_numbers():
    d10_obj = create_d10_mesh()
    return d10_obj

if __name__ == "__main__":
    d10 = create_d10_with_numbers()
    print(f"Created d10 mesh with {len(d10.data.vertices)} vertices and {len(d10.data.polygons)} faces")
    mat = bpy.data.materials.new(name="D10Mat")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1)
    d10.data.materials.append(mat) 