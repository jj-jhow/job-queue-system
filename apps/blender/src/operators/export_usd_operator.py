from bpy_extras.io_utils import ExportHelper
from bpy.props import StringProperty, BoolProperty, EnumProperty
from bpy.types import Operator

from ..logic import export_usd_logic # Import from the logic subpackage

class ExportUSDOperator(Operator, ExportHelper):
    """Export the selection or scene to a USD file"""
    bl_idname = "toolkit.export_usd"
    bl_label = "Export USD (Toolkit)"
    bl_options = {'REGISTER', 'UNDO'}

    filename_ext = ".usdc"

    filepath: StringProperty(
        name="File Path",
        description="Path to save the USD file",
        subtype='FILE_PATH',
    )
    selected_objects_only: BoolProperty(name="Selection Only", default=True)
    visible_objects_only: BoolProperty(name="Visible Objects Only", default=True)
    export_animation: BoolProperty(name="Export Animation", default=True)
    export_hair: BoolProperty(name="Export Hair", default=False)
    export_uvmaps: BoolProperty(name="Export UV Maps", default=True)
    export_normals: BoolProperty(name="Export Normals", default=True)
    export_materials: BoolProperty(name="Export Materials", default=True)
    use_instancing: BoolProperty(name="Use Instancing", default=True)
    evaluation_mode: EnumProperty(
        name="Evaluation Mode",
        items=[('VIEWPORT', "Viewport", ""), ('RENDER', "Render", "")],
        default='VIEWPORT',
    )

    def execute(self, context):
        success, message = export_usd_logic.export_usd_file(
            filepath=self.filepath,
            filename_ext=self.filename_ext, # Pass the default extension
            selected_objects_only=self.selected_objects_only,
            visible_objects_only=self.visible_objects_only,
            export_animation=self.export_animation,
            export_hair=self.export_hair,
            export_uvmaps=self.export_uvmaps,
            export_normals=self.export_normals,
            export_materials=self.export_materials,
            use_instancing=self.use_instancing,
            evaluation_mode=self.evaluation_mode
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
        layout.prop(self, "selected_objects_only")
        layout.prop(self, "visible_objects_only")
        # ... draw other properties ...
        layout.prop(self, "export_animation")
        layout.prop(self, "export_hair")
        layout.prop(self, "export_uvmaps")
        layout.prop(self, "export_normals")
        layout.prop(self, "export_materials")
        layout.prop(self, "use_instancing")
        layout.prop(self, "evaluation_mode")