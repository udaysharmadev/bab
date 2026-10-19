import { channelHalfWidth } from '../shared/world';

// Fixed horizon/FOV. These are sight-line volumes, never input or hull forces.
export const CAMERA_VOLUMES = [
  { id: 'whitewater', start: 266, end: 372, height: 8.2, back: 11.6, ahead: 5.0 },
  { id: 'timber-works', start: 392, end: 484, height: 8.8, back: 12.4, ahead: 6.2 },
  { id: 'iron-narrows', start: 510, end: 618, height: 9.2, back: 11.0, ahead: 4.6 },
  { id: 'millstone-gorge', start: 824, end: 924, height: 9.2, back: 11.0, ahead: 4.8 },
  { id: 'devils-staircase', start: 996, end: 1094, height: 9.0, back: 12.0, ahead: 6.0 },
  { id: 'final-rapids', start: 1142, end: 1378, height: 8.6, back: 11.8, ahead: 5.4 },
  { id: 'last-descent', start: 644, end: 748, height: 8.4, back: 12.0, ahead: 5.4 },
] as const;
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function riverCamera(x: number, z: number, velocityZ: number, aspect: number, gentle: boolean) {
  let height = 6.5, back = 10.3, ahead = 2.5, volume: string = 'river';
  for (const area of CAMERA_VOLUMES) {
    const weight = smooth((z - area.start) / 12) * smooth((area.end - z) / 12);
    height += (area.height - 6.5) * weight;
    back += (area.back - 10.3) * weight;
    ahead += (area.ahead - 2.5) * weight;
    if (weight > .01) volume = area.id;
  }
  // Smooth through zero speed: reversing reveals the water behind the crew
  // without rotating the world or flipping the camera to the other side.
  const reverse = smooth((-velocityZ - .1) / .65);
  ahead = (gentle ? Math.min(ahead, 3.4) : ahead + Math.min(1.2, Math.abs(velocityZ) * .4)) * (1 - reverse) - 3.0 * reverse;
  const scale = Math.max(1, .95 / Math.max(.2, aspect));
  const cameraZ = z - back * scale;
  const limit = Math.max(1, channelHalfWidth(cameraZ) - 1.6);
  return { x: Math.max(-limit, Math.min(limit, x + .9 * scale)), y: height * scale, z: cameraZ, ahead, volume };
}
