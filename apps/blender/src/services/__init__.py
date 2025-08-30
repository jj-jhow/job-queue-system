import bpy

from .websocket_server import WebSocketServer

classes = [WebSocketServer]

__all__ = [cls for cls in classes]


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
