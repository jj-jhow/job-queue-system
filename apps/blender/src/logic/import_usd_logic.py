from bpy.ops.wm import usd_import

def import_usd_file(filepath, import_cameras, import_curves, import_lights, import_materials, import_meshes, scale):
    """
    Imports a USD file using Blender's built-in USD importer.
    Returns a tuple (success_boolean, message_string).
    """
    if not filepath:
        return False, "No file selected for USD import."

    try:
        usd_import(
            filepath=filepath,
            import_cameras=import_cameras,
            import_curves=import_curves,
            import_lights=import_lights,
            import_materials=import_materials,
            import_meshes=import_meshes,
            scale=scale,
            # Pass other USD import settings here if you add more properties
        )
        return True, f"Successfully imported USD: {filepath}"
    except RuntimeError as e:
        return False, f"USD import failed: {e}"
    except Exception as e:
        return False, f"An unexpected error occurred during USD import: {e}"