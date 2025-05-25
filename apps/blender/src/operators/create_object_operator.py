from bpy.props import EnumProperty, FloatVectorProperty
from bpy.types import Operator, Scene

from ..logic import create_object_logic

OBJECT_TYPES_DEFINITION = (
    ("CUBE", "Cube", "Create a cube"),
    ("SPHERE", "Sphere", "Create a UV sphere"),
    ("PLANE", "Plane", "Create a plane"),
    ("CYLINDER", "Cylinder", "Create a cylinder"),
)


class CreateObjectOperator(Operator):
    """Create a new mesh object"""

    bl_idname = "toolkit.create_object"
    bl_label = "Create Object (Toolkit)"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        success, message = create_object_logic.create_primitive_object(
            location=context.scene.create_object_operator_location,  # Default location at origin
            object_type=context.scene.create_object_operator_object_type,  # Default object type is 'CUBE'
        )
        if success:
            self.report({"INFO"}, message)
            return {"FINISHED"}
        else:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}


def register():
    Scene.create_object_operator_object_type = EnumProperty(
        name="Panel Object Type", items=OBJECT_TYPES_DEFINITION, default="CUBE"
    )

    Scene.create_object_operator_location = FloatVectorProperty(
        name="Panel Object Location",
        description="Location to place the new object",
        default=(0.0, 0.0, 0.0),
        size=3,
        subtype="TRANSLATION",
        step=10,
    )


def unregister():
    del Scene.create_object_operator_object_type
    del Scene.create_object_operator_location
