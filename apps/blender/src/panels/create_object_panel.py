from bpy.types import Panel

from ..operators import CreateObjectOperator

class CreateObjectPanel(Panel):
    """Creates a Panel in the Object properties window"""
    bl_label = "Toolkit Object Creator"
    bl_idname = "OBJECT_PT_toolkit_object_creator"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Tools"

    def draw(self, context):
        scene = context.scene
        
        layout = self.layout

        layout.prop_menu_enum(scene, "create_object_operator_object_type", text="Object Type")
        layout.prop(scene, "create_object_operator_location", text="Location")
        
        layout.separator()
        
        layout.operator(CreateObjectOperator.bl_idname, text="Create Object")