// SVG displacement approach inspired by shuding/liquid-glass (MIT).
export function displacement(x, y, width, height, radius) {
  const px = x - width / 2, py = y - height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const qx = Math.abs(px) - (width / 2 - r);
  const qy = Math.abs(py) - (height / 2 - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const len = Math.hypot(ox, oy);
  const distance = len + Math.min(Math.max(qx, qy), 0) - r;
  if (distance > 0) return [0, 0];
  // A curved rim bends the background; the central reading area stays calm.
  const t = Math.max(0, 1 + distance / Math.max(12, r * 0.8));
  const bend = t * t * (3 - 2 * t);
  if (bend === 0) return [0, 0];
  let nx = 0, ny = 0;
  if (len > 0) { nx = ox / len; ny = oy / len; }
  else if (qx > qy) nx = 1;
  else ny = 1;
  return [-Math.sign(px) * nx * bend, -Math.sign(py) * ny * bend];
}
