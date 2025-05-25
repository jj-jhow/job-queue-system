
import bpy

# Import operator classes from the 'operators' subpackage
from .operators.import_usd_operator import ImportUSDOperator
from .operators.export_usd_operator import ExportUSDOperator
from .operators.create_object_operator import CreateObjectOperator

# Import panel classes from the 'panels' subpackage
from .panels.create_object_panel import CreateObjectPanel
from .panels.import_usd_panel import ImportUSDPanel
from .panels.export_usd_panel import ExportUSDPanel

# A list of all operator classes to register/unregister
# This makes it easier to manage as more operators are added
operator_classes = (
    ImportUSDOperator,
    CreateObjectOperator,
    ExportUSDOperator,
    ImportUSDPanel,
    CreateObjectPanel,
    ExportUSDPanel,
)

# A list of all panel classes to register/unregister
panel_classes = (
)

# --- Menu Registration ---
# Example for Import Menu
# def menu_func_import(self, cls: bpy.types.Operator, context):
#     self.layout.operator(cls.bl_idname, text=cls.bl_label)

# Example for Export Menu (you'll need to create ExportUSDOperator)
# def menu_func_export(self, context):
#     self.layout.operator(export_usd_operator.ExportUSDOperator.bl_idname, text="Toolkit USD Export (.usd, ...)")

def register():
    for cls in operator_classes:
        bpy.utils.register_class(cls)
        # # Add to menus
        # bpy.types.TOPBAR_MT_file_import.append(menu_func_import(cls))


def unregister():
    # Remove from menus
    # bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)
    # bpy.types.TOPBAR_MT_file_export.remove(menu_func_export) # Uncomment when export operator is ready

    for cls in reversed(operator_classes): # Unregister in reverse order
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()