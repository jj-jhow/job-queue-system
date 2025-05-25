import bpy

from .import_usd_operator import ImportUSDOperator
# from .create_object_operator import CreateObjectoperator
from .export_usd_operator import ExportUSDOperator

classes = (
    ImportUSDOperator,
    # CreateObjectoperator,
    ExportUSDOperator
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()