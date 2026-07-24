import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  calculateVirtualRange,
  getScrollOffsetForIndex,
  type ScrollAlignment,
} from '../src/core.js'

describe('calculateVirtualRange', () => {
  it('returns the visible rows plus bounded overscan', () => {
    const range = calculateVirtualRange({
      itemCount: 1_000,
      overscan: 2,
      rowHeight: 32,
      scrollOffset: 320,
      viewportHeight: 160,
    })

    expect(range).toMatchObject({
      endIndex: 16,
      startIndex: 8,
      totalSize: 32_000,
    })
    expect(range.items).toHaveLength(9)
    expect(range.items[0]).toEqual({
      end: 288,
      index: 8,
      size: 32,
      start: 256,
    })
    expect(Object.isFrozen(range.items)).toBe(true)
  })

  it('clamps overscan and scroll offsets at collection boundaries', () => {
    expect(
      calculateVirtualRange({
        itemCount: 4,
        overscan: 5,
        rowHeight: 20,
        scrollOffset: 10_000,
        viewportHeight: 40,
      }),
    ).toMatchObject({ endIndex: 3, startIndex: 0 })
    expect(
      calculateVirtualRange({
        itemCount: 0,
        overscan: 2,
        rowHeight: 20,
        scrollOffset: 0,
        viewportHeight: 100,
      }),
    ).toEqual({
      endIndex: -1,
      items: [],
      startIndex: 0,
      totalSize: 0,
    })
    expect(
      calculateVirtualRange({
        itemCount: 4,
        overscan: 0,
        rowHeight: 20,
        scrollOffset: 0,
        viewportHeight: 0,
      }).items,
    ).toEqual([])
  })

  it('always emits consecutive in-bounds items', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 2_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 20 }),
        (itemCount, rowHeight, viewportHeight, scrollOffset, overscan) => {
          const range = calculateVirtualRange({
            itemCount,
            overscan,
            rowHeight,
            scrollOffset,
            viewportHeight,
          })

          expect(range.startIndex).toBeGreaterThanOrEqual(0)
          expect(range.endIndex).toBeLessThan(itemCount)
          for (let index = 1; index < range.items.length; index += 1) {
            expect(range.items[index]?.index).toBe(
              (range.items[index - 1]?.index ?? -1) + 1,
            )
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it.each([
    {
      itemCount: -1,
      overscan: 0,
      rowHeight: 20,
      scrollOffset: 0,
      viewportHeight: 20,
    },
    {
      itemCount: 1,
      overscan: -1,
      rowHeight: 20,
      scrollOffset: 0,
      viewportHeight: 20,
    },
    {
      itemCount: 1,
      overscan: 0,
      rowHeight: 0,
      scrollOffset: 0,
      viewportHeight: 20,
    },
    {
      itemCount: 1,
      overscan: 0,
      rowHeight: 20,
      scrollOffset: -1,
      viewportHeight: 20,
    },
    {
      itemCount: 1,
      overscan: 0,
      rowHeight: 20,
      scrollOffset: 0,
      viewportHeight: -1,
    },
  ])('rejects invalid range options %#', (options) => {
    expect(() => calculateVirtualRange(options)).toThrow(RangeError)
  })
})

describe('getScrollOffsetForIndex', () => {
  it.each<{
    alignment: ScrollAlignment
    expected: number
  }>([
    { alignment: 'start', expected: 1_000 },
    { alignment: 'center', expected: 910 },
    { alignment: 'end', expected: 820 },
    { alignment: 'nearest', expected: 820 },
  ])('supports $alignment alignment', ({ alignment, expected }) => {
    expect(
      getScrollOffsetForIndex({
        alignment,
        currentOffset: 0,
        index: 50,
        itemCount: 100,
        rowHeight: 20,
        viewportHeight: 200,
      }),
    ).toBe(expected)
  })

  it('keeps visible items stable and clamps the first and last rows', () => {
    expect(
      getScrollOffsetForIndex({
        currentOffset: 800,
        index: 45,
        itemCount: 100,
        rowHeight: 20,
        viewportHeight: 200,
      }),
    ).toBe(800)
    expect(
      getScrollOffsetForIndex({
        currentOffset: 800,
        index: 5,
        itemCount: 100,
        rowHeight: 20,
        viewportHeight: 200,
      }),
    ).toBe(100)
    expect(
      getScrollOffsetForIndex({
        alignment: 'center',
        currentOffset: 500,
        index: 0,
        itemCount: 100,
        rowHeight: 20,
        viewportHeight: 200,
      }),
    ).toBe(0)
    expect(
      getScrollOffsetForIndex({
        alignment: 'start',
        currentOffset: 0,
        index: 99,
        itemCount: 100,
        rowHeight: 20,
        viewportHeight: 200,
      }),
    ).toBe(1_800)
  })

  it('rejects invalid indexes and dimensions', () => {
    const base = {
      currentOffset: 0,
      index: 0,
      itemCount: 1,
      rowHeight: 20,
      viewportHeight: 100,
    }

    expect(() => getScrollOffsetForIndex({ ...base, index: 1 })).toThrowError(
      'index must identify an existing item.',
    )
    expect(() => getScrollOffsetForIndex({ ...base, itemCount: -1 })).toThrow(
      RangeError,
    )
    expect(() =>
      getScrollOffsetForIndex({ ...base, rowHeight: Number.NaN }),
    ).toThrow(RangeError)
    expect(() =>
      getScrollOffsetForIndex({ ...base, viewportHeight: -1 }),
    ).toThrow(RangeError)
    expect(() =>
      getScrollOffsetForIndex({ ...base, currentOffset: -1 }),
    ).toThrow(RangeError)
  })
})
