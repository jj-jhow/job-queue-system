import open3d as o3d
import numpy as np
from pxr import Usd, UsdGeom
from scipy.spatial import cKDTree


class MeshDecimator:
    """Handles mesh decimation and attribute remapping for USD meshes."""

    def __init__(self, decimation_factor: float, vertex_remap: str = "nearest"):
        self.decimation_factor = decimation_factor
        self.vertex_remap = vertex_remap

    def _vertex_remap_nearest(self, orig_points, new_points, value):
        """
        For each new vertex, find the nearest original vertex and copy its attribute value.
        """
        print("    - Using nearest neighbor for per-vertex attribute remapping.")
        kdtree = cKDTree(np.array(orig_points, dtype=np.float64))
        _, idxs = kdtree.query(np.asarray(new_points))
        value_list = list(value)
        test = value_list[0]
        if hasattr(test, "__len__") and not isinstance(test, (str, bytes)):
            value_list = [list(v) for v in value_list]
            remapped = [value_list[i] for i in idxs]
        else:
            remapped = [value_list[i] for i in idxs]
        return remapped

    def _vertex_remap_barycentric(self, orig_points, new_points, value):
        """
        For each new vertex, find the closest original triangle, compute barycentric coordinates,
        and interpolate the attribute value using those coordinates.
        """
        print(
            "    - Using barycentric interpolation for per-vertex attribute remapping."
        )
        value = list(value)  # Ensure value supports integer indexing
        orig_points = np.asarray(orig_points)
        triangles = []
        # Build triangles from original mesh
        for i in range(0, len(orig_points) - 2, 3):
            triangles.append([i, i + 1, i + 2])
        triangles = np.array(triangles)
        tri_pts = orig_points[triangles]  # shape: (num_tris, 3, 3)

        # Build a KDTree of triangle centroids for fast lookup
        centroids = tri_pts.mean(axis=1)
        tri_kdtree = cKDTree(centroids)

        def barycentric_coords(p, tri):
            # Compute barycentric coordinates of p with respect to triangle tri (3x3)
            v0 = tri[1] - tri[0]
            v1 = tri[2] - tri[0]
            v2 = p - tri[0]
            d00 = np.dot(v0, v0)
            d01 = np.dot(v0, v1)
            d11 = np.dot(v1, v1)
            d20 = np.dot(v2, v0)
            d21 = np.dot(v2, v1)
            denom = d00 * d11 - d01 * d01
            if denom == 0:
                return np.array([1.0, 0.0, 0.0])  # fallback: all weight to first vertex
            v = (d11 * d20 - d01 * d21) / denom
            w = (d00 * d21 - d01 * d20) / denom
            u = 1.0 - v - w
            return np.array([u, v, w])

        is_array_of_arrays = hasattr(value[0], "__len__") and not isinstance(
            value[0], (str, bytes)
        )
        result = []
        for p in new_points:
            # Find closest triangle
            _, tri_idx = tri_kdtree.query(p)
            tri = triangles[tri_idx]
            tri_pts_xyz = orig_points[tri]
            bary = barycentric_coords(p, tri_pts_xyz)
            if is_array_of_arrays:
                # Interpolate each component
                v0, v1, v2 = value[tri[0]], value[tri[1]], value[tri[2]]
                interp = [
                    bary[0] * np.array(v0)
                    + bary[1] * np.array(v1)
                    + bary[2] * np.array(v2)
                ]
                interp = np.sum(interp, axis=0)
                result.append(interp.tolist())
            else:
                v0, v1, v2 = value[tri[0]], value[tri[1]], value[tri[2]]
                interp = bary[0] * v0 + bary[1] * v1 + bary[2] * v2
                result.append(interp)
        return result

    def decimate_mesh(self, points, triangles):
        """Decimate a mesh using Open3D."""
        o3d_mesh = o3d.geometry.TriangleMesh()
        o3d_mesh.vertices = o3d.utility.Vector3dVector(
            np.array(points, dtype=np.float64)
        )
        o3d_mesh.triangles = o3d.utility.Vector3iVector(
            np.array(triangles, dtype=np.int32).reshape(-1, 3)
        )
        original_triangle_count = len(o3d_mesh.triangles)
        if original_triangle_count == 0:
            return None, None
        target_triangle_count = int(original_triangle_count * self.decimation_factor)
        print(f"  - Original triangles: {original_triangle_count}")
        print(f"  - Target triangles:   {target_triangle_count}")
        decimated_mesh = o3d_mesh.simplify_quadric_decimation(target_triangle_count)
        decimated_mesh.compute_vertex_normals()
        return np.asarray(decimated_mesh.vertices), np.asarray(decimated_mesh.triangles)

    def remap_attributes(
        self,
        orig_points,
        new_points,
        primvars_api,
        new_primvars_api,
        orig_triangles=None,
        new_triangles=None,
    ):
        """Remap and copy primvars from original to decimated mesh, including face-varying."""
        # Remove all existing primvars from the new mesh (should be none, but safe)
        for pvar in new_primvars_api.GetPrimvars():
            new_primvars_api.RemovePrimvar(pvar.GetPrimvarName())
        for primvar in primvars_api.GetPrimvars():
            name = primvar.GetPrimvarName()
            interp = primvar.GetInterpolation()
            value = primvar.Get()
            if interp in [UsdGeom.Tokens.constant, UsdGeom.Tokens.uniform]:
                print(f"  - Copying {interp} primvar '{name}'")
                new_primvar = new_primvars_api.CreatePrimvar(
                    name, primvar.GetTypeName(), interp
                )
                if value is not None:
                    new_primvar.Set(value)
                else:
                    print(f"    - Skipped setting value for '{name}' (value is None)")
            elif interp == UsdGeom.Tokens.vertex:
                print(
                    f"  - Remapping vertex primvar '{name}' using {self.vertex_remap}"
                )
                if value is not None and len(value) == len(orig_points):
                    if self.vertex_remap == "nearest":
                        remapped = self._vertex_remap_nearest(
                            orig_points, new_points, value
                        )
                    elif self.vertex_remap == "barycentric":
                        remapped = self._vertex_remap_barycentric(
                            orig_points, new_points, value
                        )
                    else:
                        print(
                            f"    - Unknown vertex_remap method: {self.vertex_remap}, skipping."
                        )
                        continue
                    new_primvar = new_primvars_api.CreatePrimvar(
                        name, primvar.GetTypeName(), interp
                    )
                    new_primvar.Set(remapped)
                else:
                    print(
                        f"    - Skipped remapping for '{name}' (value missing or wrong length)"
                    )
            elif interp == UsdGeom.Tokens.faceVarying:
                print(
                    f"  - Remapping face-varying primvar '{name}' using barycentric interpolation"
                )
                if (
                    value is not None
                    and orig_triangles is not None
                    and new_triangles is not None
                ):
                    orig_points_np = np.asarray(orig_points)
                    value_np = np.asarray(value)
                    orig_triangles_np = np.asarray(orig_triangles)
                    new_triangles_np = np.asarray(new_triangles)
                    remapped = []
                    for tri in new_triangles_np:
                        # For each new triangle, get its 3 vertex positions
                        new_verts = np.asarray([new_points[i] for i in tri])
                        # Find the closest original triangle (by centroid)
                        orig_tris_pts = orig_points_np[orig_triangles_np]
                        centroids = orig_tris_pts.mean(axis=1)
                        centroid = new_verts.mean(axis=0)
                        dists = np.linalg.norm(centroids - centroid, axis=1)
                        orig_tri_idx = np.argmin(dists)
                        orig_tri = orig_triangles_np[orig_tri_idx]
                        orig_tri_pts = orig_points_np[orig_tri]
                        # For each vertex in the new triangle, compute barycentric coords in the original triangle
                        for v in new_verts:

                            def barycentric_coords(p, tri):
                                v0, v1, v2 = tri[0], tri[1], tri[2]
                                d00 = np.dot(v1 - v0, v1 - v0)
                                d01 = np.dot(v1 - v0, v2 - v0)
                                d11 = np.dot(v2 - v0, v2 - v0)
                                d20 = np.dot(p - v0, v1 - v0)
                                d21 = np.dot(p - v0, v2 - v0)
                                denom = d00 * d11 - d01 * d01
                                if denom == 0:
                                    return np.array([1.0, 0.0, 0.0])
                                v = (d11 * d20 - d01 * d21) / denom
                                w = (d00 * d21 - d01 * d20) / denom
                                u = 1.0 - v - w
                                return np.array([u, v, w])

                            bary = barycentric_coords(v, orig_tri_pts)
                            orig_fv_start = orig_tri_idx * 3
                            if orig_fv_start + 3 <= len(value_np):
                                orig_fv = value_np[orig_fv_start : orig_fv_start + 3]
                                if len(orig_fv) == 3:
                                    interp = (
                                        bary[0] * orig_fv[0]
                                        + bary[1] * orig_fv[1]
                                        + bary[2] * orig_fv[2]
                                    )
                                else:
                                    interp = orig_fv[0] if len(orig_fv) > 0 else 0.0
                            else:
                                interp = value_np[0] if len(value_np) > 0 else 0.0
                            remapped.append(
                                interp.tolist() if hasattr(interp, "tolist") else interp
                            )
                    new_primvar = new_primvars_api.CreatePrimvar(
                        name,
                        primvar.GetTypeName(),
                        interpolation=UsdGeom.Tokens.faceVarying,
                    )
                    new_primvar.Set(remapped)
                else:
                    print(
                        f"    - Skipped remapping for '{name}' (missing value or triangle info)"
                    )
            else:
                print(f"  - Removing/skipping {interp} primvar '{name}' (not remapped)")

    def triangulate_mesh(self, face_vertex_counts, face_vertex_indices):
        """Triangulate mesh faces (fan triangulation for n-gons)."""
        triangles = []
        idx = 0
        for count in face_vertex_counts:
            if count < 3:
                idx += count
                continue
            if count == 3:
                triangles.append(
                    [
                        face_vertex_indices[idx],
                        face_vertex_indices[idx + 1],
                        face_vertex_indices[idx + 2],
                    ]
                )
            else:
                for i in range(1, count - 1):
                    triangles.append(
                        [
                            face_vertex_indices[idx],
                            face_vertex_indices[idx + i],
                            face_vertex_indices[idx + i + 1],
                        ]
                    )
            idx += count
        return triangles


def process_usd_file(
    input_usd_path: str,
    output_usd_path: str,
    decimation_factor: float,
    vertex_remap: str = "nearest",
):
    """Main entry point: decimate all meshes in a USD file and write to a new file."""
    input_stage = Usd.Stage.Open(input_usd_path)
    output_stage = Usd.Stage.CreateNew(output_usd_path)
    decimator = MeshDecimator(decimation_factor, vertex_remap=vertex_remap)
    for prim in input_stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh):
            continue

        print(f"Processing mesh: {prim.GetPath()}")
        usd_mesh = UsdGeom.Mesh(prim)
        points = usd_mesh.GetPointsAttr().Get()
        if not points:
            continue

        face_vertex_counts = usd_mesh.GetFaceVertexCountsAttr().Get()
        face_vertex_indices = usd_mesh.GetFaceVertexIndicesAttr().Get()
        if not face_vertex_counts or not face_vertex_indices:
            print(
                f"  - Warning: Could not get face data for mesh {prim.GetPath()}. Skipping."
            )
            continue

        triangles = decimator.triangulate_mesh(face_vertex_counts, face_vertex_indices)
        if not triangles:
            print(
                f"  - Warning: Could not triangulate mesh {prim.GetPath()}. Skipping."
            )
            continue

        # Decimate the mesh
        new_vertices, new_triangles = decimator.decimate_mesh(points, triangles)
        if new_vertices is None or new_triangles is None:
            continue

        new_usd_mesh = UsdGeom.Mesh.Define(output_stage, prim.GetPath())
        new_usd_mesh.GetPointsAttr().Set(new_vertices)
        new_usd_mesh.GetFaceVertexCountsAttr().Set([3] * len(new_triangles))
        new_usd_mesh.GetFaceVertexIndicesAttr().Set(new_triangles.flatten())
        new_usd_mesh.GetSubdivisionSchemeAttr().Set(UsdGeom.Tokens.none)

        # Copy over attributes
        decimator.remap_attributes(
            points,
            new_vertices,
            UsdGeom.PrimvarsAPI(usd_mesh),
            UsdGeom.PrimvarsAPI(new_usd_mesh),
            orig_triangles=triangles,
            new_triangles=new_triangles,
        )

    output_stage.GetRootLayer().Save()
    print(f"\nSuccessfully saved decimated composition layer to {output_usd_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Decimate meshes in a USD file.")
    parser.add_argument("input", help="Path to the input USD file.")
    parser.add_argument("output", help="Path to the output USD file.")
    parser.add_argument(
        "-f",
        "--factor",
        type=float,
        default=0.2,
        help="Decimation factor (0.0 < factor <= 1.0). Default: 0.2",
    )
    parser.add_argument(
        "-r",
        "--vertex-remap",
        choices=["nearest", "barycentric"],
        default="nearest",
        help="Method for per-vertex attribute remapping: 'nearest' (default) or 'barycentric' (experimental, fallback to nearest).",
    )
    args = parser.parse_args()
    process_usd_file(
        input_usd_path=args.input,
        output_usd_path=args.output,
        decimation_factor=args.factor,
        vertex_remap=args.vertex_remap,
    )
