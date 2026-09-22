// Frame-rate independent exponential drag. Velocity is measured in px/second.
export function glide(position, velocity, dt, min, max) {
  dt = Math.max(0, Math.min(.04, dt));
  const decay = Math.exp(-7 * dt);
  const next = position + velocity * (1 - decay) / 7;
  if (next < min) return { position: min, velocity: Math.abs(velocity) * .22 };
  if (next > max) return { position: max, velocity: -Math.abs(velocity) * .22 };
  return { position: next, velocity: velocity * decay };
}
