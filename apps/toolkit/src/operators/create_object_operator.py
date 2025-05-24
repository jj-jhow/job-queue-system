import bpy
from bpy.types import Operator
from bpy.props import EnumProperty
from ..logic import create_object_logic # Import from the logic subpackage

class CreateObjectOperator(Operator):
    """Create a new mesh object"""
    bl_idname = "toolkit.create_object"
    bl_label = "Create Object (Toolkit)"
    bl_options = {'REGISTER', 'UNDO'}

    object_type: EnumProperty(
        name="Type",
        description="Type of object to create",
        items=(
            ('CUBE', "Cube", "Create a cube"),
            ('SPHERE', "Sphere", "Create a UV sphere"),
            ('PLANE', "Plane", "Create a plane"),
            ('CYLINDER', "Cylinder", "Create a cylinder"),
        ),
        default='CUBE',
    )

    def execute(self, context):
        success, message = create_object_logic.create_primitive_object(
            object_type=self.object_type,
            location=context.scene.cursor.location
        )
        if success:
            self.report({'INFO'}, message)
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}

    def invoke(self, context, event):
        # For simple creation, execute is often enough if called directly or from search.
        # Options will be available in Redo Last panel (F9).
        return self.execute(context)
        # If you want a dialog to pop up to choose the type first:
        # return context.window_manager.invoke_props_dialog(self)

    # Optional: If you want the properties to be drawn in a menu or panel
    # def draw(self, context):
    #     layout = self.layout
    #     layout.prop(self, "object_type")