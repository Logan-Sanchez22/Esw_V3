/**
 * Deterministic pseudo-random float in [0, 1) for an integer seed — the same
 * seed always produces the same output, so a tile's visual variant stays
 * stable across re-renders and reloads without persisting anything new.
 * Classic GLSL-style hash, not cryptographic — fine for "which grass sprite."
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Picks one of `variants` for a given seed (e.g. a tile's index). Repeat an
 * entry in `variants` to weight it higher — no separate weight field needed.
 */
export function pickVariant<T>(seed: number, variants: readonly T[]): T {
  const index = Math.min(Math.floor(seededRandom(seed) * variants.length), variants.length - 1);
  return variants[index];
}
