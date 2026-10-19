const STEP = 0.05

export const SIZE_LIMIT = {
  w: { min: 0.2, max: 12 },
  d: { min: 0.2, max: 12 },
  h: { min: 0.15, max: 8 },
}

export function snapDim(value, step = STEP) {
  const snapped = Math.round((value + Number.EPSILON) / step) * step
  return Math.round(snapped * 1000) / 1000
}

export const ENGINEERING_LIMIT = {
  w: { min: 0.15, max: 80 },
  d: { min: 0.15, max: 80 },
  h: { min: 0.04, max: 40 },
}

export function clampDim(axis, value, limits = SIZE_LIMIT) {
  const limit = limits[axis] || limits.w
  return Math.min(limit.max, Math.max(limit.min, value))
}

export function dimensionsFromDrag(base, axis, distance) {
  const next = { w: base.w, d: base.d, h: base.h }
  if (axis === 'w' || axis === 'd') {
    next[axis] = snapDim(clampDim(axis, Math.abs(distance) * 2))
    return next
  }
  if (axis === 'h') {
    next.h = snapDim(clampDim('h', distance))
    return next
  }
  const ratio = distance / Math.max(0.05, base.span || 1)
  next.w = snapDim(clampDim('w', base.w * ratio))
  next.d = snapDim(clampDim('d', base.d * ratio))
  next.h = snapDim(clampDim('h', base.h * ratio))
  return next
}

export function sameSize(a, b) {
  return Math.abs(a.w - b.w) < 0.001 && Math.abs(a.d - b.d) < 0.001 && Math.abs(a.h - b.h) < 0.001
}

export function samePose(a, b) {
  return sameSize(a, b) && Math.abs(a.x - b.x) < 0.001 && Math.abs(a.z - b.z) < 0.001
}

export function resizeFromEdge(base, axis, sign, along, limits = SIZE_LIMIT) {
  const next = { w: base.w, d: base.d, h: base.h, shift: 0 }
  const old = base[axis]
  const size = snapDim(clampDim(axis, sign * along + old / 2, limits))
  next[axis] = size
  next.shift = sign * (size - old) / 2
  return next
}
