import bpy

from .create_object_panel import CreateObjectPanel
from .import_usd_panel import ImportUSDPanel
from .export_usd_panel import ExportUSDPanel

classes = (
    ExportUSDPanel,
    ImportUSDPanel,
    CreateObjectPanel
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()