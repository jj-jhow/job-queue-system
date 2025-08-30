from bpy.props import BoolProperty, FloatProperty
from bpy.types import Operator, Scene
from bpy_extras.io_utils import ImportHelper

from ..logic import import_usd_logic


class ImportUSDOperator(Operator, ImportHelper):
    """Import a USD file using Blender's built-in USD importer"""

    bl_idname = "toolkit.import_usd"
    bl_label = "Import USD (Toolkit)"
    bl_options = {"REGISTER", "UNDO"}

    filename_ext = ".usd;.usda;.usdc;.usdz"

    def execute(self, context):
        success, message = import_usd_logic.import_usd_file(
            filepath=self.filepath,
            import_cameras=context.scene.import_usd_operator_import_cameras,
            import_curves=context.scene.import_usd_operator_import_curves,
            import_lights=context.scene.import_usd_operator_import_lights,
            import_materials=context.scene.import_usd_operator_import_materials,
            import_meshes=context.scene.import_usd_operator_import_meshes,
            scale=context.scene.import_usd_operator_scale,
        )
        if success:
            self.report({"INFO"}, message)
            return {"FINISHED"}
        else:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}

    def draw(self, context):
        scene = context.scene

        layout = self.layout

        layout.use_property_split = True
        layout.use_property_decorate = False

        layout.prop(scene, "import_usd_operator_import_cameras", text="Import Cameras")
        layout.prop(scene, "import_usd_operator_import_curves", text="Import Curves")
        layout.prop(scene, "import_usd_operator_import_lights", text="Import Lights")
        layout.prop(
            scene, "import_usd_operator_import_materials", text="Import Materials"
        )
        layout.prop(scene, "import_usd_operator_import_meshes", text="Import Meshes")
        layout.prop(scene, "import_usd_operator_scale", text="Scale")


def register():
    Scene.import_usd_operator_import_cameras = BoolProperty(
        name="Import Cameras", default=True
    )
    Scene.import_usd_operator_import_curves = BoolProperty(
        name="Import Curves", default=True
    )
    Scene.import_usd_operator_import_lights = BoolProperty(
        name="Import Lights", default=True
    )
    Scene.import_usd_operator_import_materials = BoolProperty(
        name="Import Materials", default=True
    )
    Scene.import_usd_operator_import_meshes = BoolProperty(
        name="Import Meshes", default=True
    )
    Scene.import_usd_operator_scale = FloatProperty(
        name="Scale", default=1.0, min=0.0001, soft_max=1000.0
    )


def unregister():
    del Scene.import_usd_operator_import_cameras
    del Scene.import_usd_operator_import_curves
    del Scene.import_usd_operator_import_lights
    del Scene.import_usd_operator_import_materials
    del Scene.import_usd_operator_import_meshes
    del Scene.import_usd_operator_scale
