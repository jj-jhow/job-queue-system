import bpy

from .import_usd_operator import ImportUSDOperator
from .create_object_operator import CreateObjectOperator, OBJECT_TYPES_DEFINITION
from .export_usd_operator import ExportUSDOperator, EVALUATION_MODES


classes = (
    ImportUSDOperator,
    CreateObjectOperator,
    ExportUSDOperator
)

__all__ = [cls.__name__ for cls in classes] + [OBJECT_TYPES_DEFINITION, EVALUATION_MODES]


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()