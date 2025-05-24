import bpy
from bpy_extras.io_utils import ImportHelper
from bpy.props import StringProperty, BoolProperty, FloatProperty
from bpy.types import Operator
from ..logic import import_logic # Import from the logic subpackage

class ImportUSDOperator(Operator, ImportHelper):
    """Import a USD file using Blender's built-in USD importer"""
    bl_idname = "toolkit.import_usd"
    bl_label = "Import USD (Toolkit)"
    bl_options = {'REGISTER', 'UNDO'}

    filename_ext = ".usd;.usda;.usdc;.usdz"

    filepath: StringProperty(
        name="File Path",
        description="Path to the USD file",
        subtype='FILE_PATH',
    )
    import_cameras: BoolProperty(name="Import Cameras", default=True)
    import_curves: BoolProperty(name="Import Curves", default=True)
    import_lights: BoolProperty(name="Import Lights", default=True)
    import_materials: BoolProperty(name="Import Materials", default=True)
    import_meshes: BoolProperty(name="Import Meshes", default=True)
    scale: FloatProperty(name="Scale", default=1.0, min=0.0001, soft_max=1000.0)

    def execute(self, context):
        success, message = import_logic.import_usd_file(
            filepath=self.filepath,
            import_cameras=self.import_cameras,
            import_curves=self.import_curves,
            import_lights=self.import_lights,
            import_materials=self.import_materials,
            import_meshes=self.import_meshes,
            scale=self.scale
        )
        if success:
            self.report({'INFO'}, message)
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}

    def draw(self, context):
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False
        layout.prop(self, "import_cameras")
        layout.prop(self, "import_curves")
        layout.prop(self, "import_lights")
        layout.prop(self, "import_materials")
        layout.prop(self, "import_meshes")
        layout.prop(self, "scale")