import bpy

from ..operators.import_usd_operator import ImportUSDOperator

class ImportUSDPanel(bpy.types.Panel):
    """Creates a Panel in the Object properties window"""
    bl_label = "Toolkit USD Importer"
    bl_idname = "OBJECT_PT_toolkit_usd_importer"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Tools"

    def draw(self, context):
        layout = self.layout
        layout.operator(ImportUSDOperator.bl_idname, text="Import USD")