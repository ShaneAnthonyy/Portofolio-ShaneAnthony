const clamp = (value, low = 0, high = 1) => Math.min(Math.max(value, low), high)

export function arrivalProgress(dive) {
  return clamp((dive - 0.93) / 0.0695)
}

export function dockProgress(progress) {
  const t = clamp((progress - 0.24) / 0.76)
  return t * t * (3 - 2 * t)
}

export function magneticMotion(distance, velocity, coarse) {
  const speed = clamp(velocity, 360, coarse ? 900 : 1400)
  const duration = clamp(2 * distance / speed, coarse ? 0.4 : 0.45, coarse ? 1.0 : 1.5)
  const slope = clamp(speed * duration / Math.max(distance, 1), 0.5, 2.5)
  return { duration, ease: t => t * t * (3 - 2 * t) + slope * t * (1 - t) ** 2 }
}
