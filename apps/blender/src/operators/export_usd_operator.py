from bpy_extras.io_utils import ExportHelper
from bpy.props import BoolProperty, EnumProperty
from bpy.types import Operator, Scene

from ..logic import export_usd_logic

EVALUATION_MODES = (
    ('VIEWPORT', "Viewport", "Use viewport evaluation mode"),
    ('RENDER', "Render", "Use render evaluation mode"),
)

class ExportUSDOperator(Operator, ExportHelper):
    """Export the selection or scene to a USD file"""
    bl_idname = "toolkit.export_usd"
    bl_label = "Export USD (Toolkit)"
    bl_options = {'REGISTER', 'UNDO'}

    filename_ext = ".usdc"

    def execute(self, context):
        success, message = export_usd_logic.export_usd_file(
            filepath=self.filepath,
            filename_ext=self.filename_ext, # Pass the default extension
            selected_objects_only=context.scene.export_usd_operator_selected_objects_only,
            visible_objects_only=context.scene.export_usd_operator_visible_objects_only,
            export_animation=context.scene.export_usd_operator_export_animation,
            export_hair=context.scene.export_usd_operator_export_hair,
            export_uvmaps=context.scene.export_usd_operator_export_uvmaps,
            export_normals=context.scene.export_usd_operator_export_normals,
            export_materials=context.scene.export_usd_operator_export_materials,
            use_instancing=context.scene.export_usd_operator_use_instancing,
            evaluation_mode=context.scene.export_usd_operator_evaluation_mode
        )
        if success:
            self.report({'INFO'}, message)
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}


    def draw(self, context):
        scene = context.scene

        layout = self.layout

        layout.use_property_split = True
        layout.use_property_decorate = False

        layout.prop(scene, "export_usd_operator_selected_objects_only")
        layout.prop(scene, "export_usd_operator_visible_objects_only")
        layout.prop(scene, "export_usd_operator_export_animation")
        layout.prop(scene, "export_usd_operator_export_hair")
        layout.prop(scene, "export_usd_operator_export_uvmaps")
        layout.prop(scene, "export_usd_operator_export_normals")
        layout.prop(scene, "export_usd_operator_export_materials")
        layout.prop(scene, "export_usd_operator_use_instancing")
        layout.prop(scene, "export_usd_operator_evaluation_mode")


def register():
    Scene.export_usd_operator_selected_objects_only = BoolProperty(name="Selection Only", default=True)
    Scene.export_usd_operator_visible_objects_only = BoolProperty(name="Visible Objects Only", default=True)
    Scene.export_usd_operator_export_animation = BoolProperty(name="Export Animation", default=True)
    Scene.export_usd_operator_export_hair = BoolProperty(name="Export Hair", default=False)
    Scene.export_usd_operator_export_uvmaps = BoolProperty(name="Export UV Maps", default=True)
    Scene.export_usd_operator_export_normals = BoolProperty(name="Export Normals", default=True)
    Scene.export_usd_operator_export_materials = BoolProperty(name="Export Materials", default=True)
    Scene.export_usd_operator_use_instancing = BoolProperty(name="Use Instancing", default=True)
    Scene.export_usd_operator_evaluation_mode = EnumProperty(
        name="Evaluation Mode",
        items=EVALUATION_MODES,
        default='VIEWPORT',
    )


def unregister():
    del Scene.export_usd_operator_selected_objects_only
    del Scene.export_usd_operator_visible_objects_only
    del Scene.export_usd_operator_export_animation
    del Scene.export_usd_operator_export_hair
    del Scene.export_usd_operator_export_uvmaps
    del Scene.export_usd_operator_export_normals
    del Scene.export_usd_operator_export_materials
    del Scene.export_usd_operator_use_instancing
    del Scene.export_usd_operator_evaluation_mode