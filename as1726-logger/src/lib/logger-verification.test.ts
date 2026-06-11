import { describe, it, expect } from 'vitest'
import { defectLabel, findLayerIndexAtDepth, makeDefect, type LayerInput } from './as1726'

// Replicates CoreViewer's calibration mapping (fraction -> depth).
function fracToDepth(frac: number, topFrac: number, bottomFrac: number, topDepth: number, bottomDepth: number) {
  const span = bottomDepth - topDepth
  return topDepth + ((frac - topFrac) / (bottomFrac - topFrac)) * span
}

describe('calibration math', () => {
  it('midpoint between 0m and 1m calibration clicks yields 0.50m', () => {
    // top of core clicked at 10% of image, bottom at 90%
    const d = fracToDepth(0.5, 0.1, 0.9, 0, 1)
    expect(Number(d.toFixed(2))).toBe(0.5)
  })
  it('maps real-world box depths (9m-14m) linearly', () => {
    // box top depth 9.0 at frac 0.05, bottom 14.0 at frac 0.95
    expect(Number(fracToDepth(0.05, 0.05, 0.95, 9, 14).toFixed(2))).toBe(9)
    expect(Number(fracToDepth(0.95, 0.05, 0.95, 9, 14).toFixed(2))).toBe(14)
    expect(Number(fracToDepth(0.5, 0.05, 0.95, 9, 14).toFixed(2))).toBe(11.5)
  })
})

describe('defect helpers', () => {
  const layers: LayerInput[] = [
    { id: 'a', depthFrom: 9, depthTo: 11.5, type: 'rock', major: 'SANDSTONE', uscs: '', description: '' },
    { id: 'b', depthFrom: 11.5, depthTo: 14, type: 'rock', major: 'SILTSTONE', uscs: '', description: '' },
  ]
  it('finds the layer spanning a depth (keeps boundaries)', () => {
    expect(findLayerIndexAtDepth(layers, 10.6)).toBe(0)
    expect(findLayerIndexAtDepth(layers, 12.3)).toBe(1)
    expect(findLayerIndexAtDepth(layers, 99)).toBe(-1)
  })
  it('formats an OpenGround-style discontinuity label', () => {
    const d = makeDefect(9.8, 'joint', 35)
    expect(defectLabel(d)).toBe('9.80m: joint 35°')
  })
  it('makeDefect rounds depth and defaults angle to null', () => {
    const d = makeDefect(10.667, 'fracture')
    expect(d.depth).toBe(10.67)
    expect(d.angle).toBeNull()
  })
})
