import * as T from 'three';
import { channelHalfWidth } from '../shared/world';

export function riverbedGeometry(start: number, length = 60) {
  const geometry = new T.PlaneGeometry(1, length, 6, 12);
  const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const z = start + length / 2 - p.getY(i), width = channelHalfWidth(z), column = i % 7;
    const x = [-width - .8, -width + .25, -width + 2, 0, width - 2, width - .25, width + .8][column]!;
    // Centre matches the existing physical floor. Shallows begin outside the
    // hull-width navigable lane; this visual bed never adds hidden obstacles.
    const y = [-.12, -.65, -1.8, -1.8, -1.8, -.65, -.12][column]!;
    p.setXYZ(i, x, y, z);
    uv.setXY(i, x / 8, z / 8);
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
