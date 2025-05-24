bl_info = {
    "name": "My Toolkit Addon",
    "blender": (4, 2, 0), # Updated to match Blender 4.2
    "category": "Object", # Or a more general category like "Tools" or "Pipeline"
    "version": (0, 1, 0),
    "author": "Jonathan Madeira",
    "description": "A collection of utility operators for Blender.",
    "location": "Various (Search menu, File > Import/Export)",
    "warning": "",
    "doc_url": "",
    "tracker_url": "",
}

import bpy

# Import operator classes from the 'operators' subpackage
from .operators.import_usd_operator import ImportUSDOperator
from .operators.export_usd_operator import ExportUSDOperator
from .operators.create_object_operator import CreateObjectOperator

# A list of all operator classes to register/unregister
# This makes it easier to manage as more operators are added
classes = (
    ImportUSDOperator,
    CreateObjectOperator,
    ExportUSDOperator, 
)

# --- Menu Registration ---
# Example for Import Menu
def menu_func_import(self, cls: bpy.types.Operator, context):
    self.layout.operator(cls.bl_idname, text=cls.bl_label)

# Example for Export Menu (you'll need to create ExportUSDOperator)
# def menu_func_export(self, context):
#     self.layout.operator(export_usd_operator.ExportUSDOperator.bl_idname, text="Toolkit USD Export (.usd, ...)")

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

    # Add to menus
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import(cls))

    print(f"{bl_info['name']} version {bl_info['version']} Registered")

def unregister():
    # Remove from menus
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)
    # bpy.types.TOPBAR_MT_file_export.remove(menu_func_export) # Uncomment when export operator is ready

    for cls in reversed(classes): # Unregister in reverse order
        bpy.utils.unregister_class(cls)

    print(f"{bl_info['name']} Unregistered")

if __name__ == "__main__":
    register()