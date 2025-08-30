from bpy.ops import wm


def export_usd_file(
    filepath,
    filename_ext,
    selected_objects_only,
    visible_objects_only,
    export_animation,
    export_hair,
    export_uvmaps,
    export_normals,
    export_materials,
    use_instancing,
    evaluation_mode,
):
    """
    Exports to a USD file using Blender's built-in USD exporter.
    Returns a tuple (success_boolean, message_string).
    """
    if not filepath:
        return False, "No file path specified for USD export."

    # Ensure the extension is correct if the user didn't type it
    if not filepath.lower().endswith(filename_ext):
        filepath += filename_ext

    try:
        wm.usd_export(
            filepath=filepath,
            selected_objects_only=selected_objects_only,
            visible_objects_only=visible_objects_only,
            export_animation=export_animation,
            export_hair=export_hair,
            export_uvmaps=export_uvmaps,
            export_normals=export_normals,
            export_materials=export_materials,
            use_instancing=use_instancing,
            evaluation_mode=evaluation_mode,
            # Pass other properties here if you added them
        )
        return True, f"Successfully exported USD to: {filepath}"
    except RuntimeError as e:
        return False, f"USD export failed: {e}"
    except Exception as e:
        return False, f"An unexpected error occurred during USD export: {e}"
