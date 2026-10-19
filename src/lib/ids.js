let seq = 0

export function uid(prefix = 'el') {
  seq += 1
  return `${prefix}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
