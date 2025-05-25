from bpy.types import Panel

from ..operators.create_object_operator import CreateObjectOperator

class CreateObjectPanel(Panel):
    """Creates a Panel in the Object properties window"""
    bl_label = "Toolkit Object Creator"
    bl_idname = "OBJECT_PT_toolkit_object_creator"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Tools"

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        layout.prop_menu_enum(scene, "toolkit_panel_object_type", text="Object Type")
        layout.prop(scene, "toolkit_panel_location", text="Location")
        layout.separator()
        
        op = layout.operator(CreateObjectOperator.bl_idname, text="Create Object")
        op.object_type = scene.toolkit_panel_object_type
        op.location = scene.toolkit_panel_location