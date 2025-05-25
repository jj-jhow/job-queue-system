from bpy.types import Panel

from ..operators.export_usd_operator import ExportUSDOperator

class ExportUSDPanel(Panel):
    """Creates a Panel in the Object properties window"""
    bl_label = "Toolkit USD Exporter"
    bl_idname = "OBJECT_PT_toolkit_usd_exporter"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Tools"

    def draw(self, context):
        layout = self.layout
        layout.operator(ExportUSDOperator.bl_idname, text="Export USD")