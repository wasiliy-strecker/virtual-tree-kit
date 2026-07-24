import { describe, expect, it } from 'vitest'

import {
  createTreeCollection,
  findTypeaheadMatch,
  resolveTreeNavigation,
} from '../src/core.js'
import { adapter, roots } from './fixtures.js'

const collection = createTreeCollection(roots, adapter)

describe('resolveTreeNavigation', () => {
  it('moves vertically and clamps at both ends', () => {
    const items = collection.getVisibleItems(new Set())

    expect(resolveTreeNavigation(items, null, 'next')).toEqual({
      activeIndex: 1,
      expansion: null,
    })
    expect(resolveTreeNavigation(items, 2, 'next').activeIndex).toBe(2)
    expect(resolveTreeNavigation(items, 0, 'previous').activeIndex).toBe(0)
    expect(resolveTreeNavigation(items, 2, 'first').activeIndex).toBe(0)
    expect(resolveTreeNavigation(items, 0, 'last').activeIndex).toBe(2)
  })

  it('expands before entering children and collapses before entering a parent', () => {
    const collapsed = collection.getVisibleItems(new Set())
    const expanded = collection.getVisibleItems(new Set(['alpha', 'alpha-two']))

    expect(resolveTreeNavigation(collapsed, 0, 'first-child')).toEqual({
      activeIndex: 0,
      expansion: { expanded: true, id: 'alpha' },
    })
    expect(resolveTreeNavigation(expanded, 0, 'first-child')).toEqual({
      activeIndex: 1,
      expansion: null,
    })
    expect(resolveTreeNavigation(expanded, 2, 'parent')).toEqual({
      activeIndex: 2,
      expansion: { expanded: false, id: 'alpha-two' },
    })
    expect(resolveTreeNavigation(expanded, 3, 'parent')).toEqual({
      activeIndex: 2,
      expansion: null,
    })
    expect(resolveTreeNavigation(collapsed, 1, 'first-child').activeIndex).toBe(
      1,
    )
    expect(resolveTreeNavigation(collapsed, 1, 'parent').activeIndex).toBe(1)
  })

  it('recovers invalid active indexes and handles an empty collection', () => {
    const items = collection.getVisibleItems(new Set())

    expect(resolveTreeNavigation(items, 99, 'previous').activeIndex).toBe(0)
    expect(resolveTreeNavigation([], null, 'next')).toEqual({
      activeIndex: null,
      expansion: null,
    })
  })
})

describe('findTypeaheadMatch', () => {
  const items = collection.getVisibleItems(new Set(['alpha']))

  it('wraps from the active item and ignores case and accents', () => {
    expect(findTypeaheadMatch(items, 3, 'al')).toBe(0)
    expect(findTypeaheadMatch(items, 0, 'alpha o')).toBe(1)
    expect(findTypeaheadMatch(items, null, 'BETA', 'en')).toBe(3)
  })

  it('retains the active item for empty or unmatched input', () => {
    expect(findTypeaheadMatch(items, 2, '')).toBe(2)
    expect(findTypeaheadMatch(items, 2, 'missing')).toBe(2)
    expect(findTypeaheadMatch([], null, 'a')).toBeNull()
    expect(findTypeaheadMatch(items, 99, '')).toBe(0)
  })
})
