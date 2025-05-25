from bpy.types import Operator
from bpy.props import EnumProperty, FloatVectorProperty
from bpy.types import Scene

from ..logic import create_object_logic  # Import from the logic subpackage

OBJECT_TYPES_DEFINITION = (
    ('CUBE', "Cube", "Create a cube"),
    ('SPHERE', "Sphere", "Create a UV sphere"),
    ('PLANE', "Plane", "Create a plane"),
    ('CYLINDER', "Cylinder", "Create a cylinder"),
    # Add more primitive types if desired
)

class CreateObjectOperator(Operator):
    """Create a new mesh object"""
    bl_idname = "toolkit.create_object"
    bl_label = "Create Object (Toolkit)"
    bl_options = {'REGISTER', 'UNDO'}

    object_type: EnumProperty(
        name="Type",
        description="Type of object to create",
        items=OBJECT_TYPES_DEFINITION,
        default='CUBE',
    )
    location: FloatVectorProperty(
        name="Location",
        description="Location to place the new object",
        default=(0.0, 0.0, 0.0),
        size=3,
        subtype='TRANSLATION',
    )

    def execute(self, context):
        success, message = create_object_logic.create_primitive_object(
            location=self.location,  # Default location at origin
            object_type=self.object_type
        )
        if success:
            self.report({'INFO'}, message)
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
    def draw(self, _context):
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False
        layout.prop(self, "object_type")
        layout.prop(self, "location")

def register():
    Scene.toolkit_panel_object_type = EnumProperty(
        name="Panel Object Type",
        items=OBJECT_TYPES_DEFINITION,
        default='CUBE'
    )

    Scene.toolkit_panel_location = FloatVectorProperty(
        name="Panel Object Location",
        description="Location to place the new object",
        default=(0.0, 0.0, 0.0),
        size=3,
        subtype='TRANSLATION',
        step=10,
    )

def unregister():

    del Scene.toolkit_panel_object_type
    del Scene.toolkit_panel_location