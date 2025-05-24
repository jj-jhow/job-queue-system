import bpy

def create_primitive_object(object_type, location):
    """
    Creates a primitive mesh object.
    Returns a tuple (success_boolean, message_string).
    """
    try:
        if object_type == 'CUBE':
            bpy.ops.mesh.primitive_cube_add(size=2, enter_editmode=False, align='WORLD', location=location)
        elif object_type == 'SPHERE':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=1, enter_editmode=False, align='WORLD', location=location)
        elif object_type == 'PLANE':
            bpy.ops.mesh.primitive_plane_add(size=2, enter_editmode=False, align='WORLD', location=location)
        elif object_type == 'CYLINDER':
            bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, enter_editmode=False, align='WORLD', location=location)
        else:
            return False, f"Unknown object type: {object_type}"
        
        return True, f"{object_type.capitalize()} created at {location}."
    except RuntimeError as e:
        return False, f"Object creation failed: {e}"
    except Exception as e:
        return False, f"An unexpected error occurred during object creation: {e}"