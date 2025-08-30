import bpy
from bpy.types import Operator


class CleanSceneOperator(Operator):
    """Remove all objects and unused data from the current Blender file"""

    bl_idname = "toolkit.clean_scene"
    bl_label = "Clean Scene (Toolkit)"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        # Delete all objects
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete()

        # Remove unused data blocks
        for block in bpy.data.meshes:
            if block.users == 0:
                bpy.data.meshes.remove(block)
        for block in bpy.data.materials:
            if block.users == 0:
                bpy.data.materials.remove(block)
        for block in bpy.data.textures:
            if block.users == 0:
                bpy.data.textures.remove(block)
        for block in bpy.data.images:
            if block.users == 0:
                bpy.data.images.remove(block)
        for block in bpy.data.curves:
            if block.users == 0:
                bpy.data.curves.remove(block)
        for block in bpy.data.cameras:
            if block.users == 0:
                bpy.data.cameras.remove(block)
        for block in bpy.data.lights:
            if block.users == 0:
                bpy.data.lights.remove(block)
        for block in bpy.data.armatures:
            if block.users == 0:
                bpy.data.armatures.remove(block)
        for block in bpy.data.actions:
            if block.users == 0:
                bpy.data.actions.remove(block)

        self.report({"INFO"}, "Scene and unused data cleaned.")
        return {"FINISHED"}


def register():
    pass


def unregister():
    pass
