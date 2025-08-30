from bpy.ops import mesh

from collections.abc import Sequence
from mathutils import Vector
from typing import Literal


def create_primitive_object(
    location: Sequence[float] | Vector | None,
    object_type: Literal["CUBE", "SPHERE", "PLANE", "CYLINDER"] | None = "CUBE",
):
    """
    Creates a primitive mesh object.
    Returns a tuple (success_boolean, message_string).
    """
    try:
        if object_type == "CUBE":
            mesh.primitive_cube_add(
                size=2, enter_editmode=False, align="WORLD", location=location
            )
        elif object_type == "SPHERE":
            mesh.primitive_uv_sphere_add(
                radius=1, enter_editmode=False, align="WORLD", location=location
            )
        elif object_type == "PLANE":
            mesh.primitive_plane_add(
                size=2, enter_editmode=False, align="WORLD", location=location
            )
        elif object_type == "CYLINDER":
            mesh.primitive_cylinder_add(
                radius=1,
                depth=2,
                enter_editmode=False,
                align="WORLD",
                location=location,
            )
        else:
            return False, f"Unknown object type: {object_type}"

        return True, f"{object_type.capitalize()} created at {location}."
    except RuntimeError as e:
        return False, f"Object creation failed: {e}"
    except Exception as e:
        return False, f"An unexpected error occurred during object creation: {e}"
