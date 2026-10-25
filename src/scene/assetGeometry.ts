import * as THREE from "three";
/** glTF quantization stores positions in integer arrays. Expand before baking transforms:
 * writing metre coordinates back into normalized Int16 attributes wraps the geometry. */
export function bakeGeometry(source: THREE.Mesh) {
  source.updateWorldMatrix(true, true);
  const geo = source.geometry.clone();
  for (const name of ["position", "normal", "tangent"]) {
    const attr = geo.getAttribute(name);
    if (!attr) continue;
    const values = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++)
      for (let j = 0; j < attr.itemSize; j++)
        values[i * attr.itemSize + j] = attr.getComponent(i, j);
    geo.setAttribute(
      name,
      new THREE.Float32BufferAttribute(values, attr.itemSize),
    );
  }
  geo.applyMatrix4(source.matrixWorld);
  geo.computeBoundingBox();
  return geo;
}
