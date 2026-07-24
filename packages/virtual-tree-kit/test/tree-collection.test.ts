import { describe, expect, it } from 'vitest'

import { createTreeCollection, type TreeAdapter } from '../src/core.js'
import type { TreeCollectionError } from '../src/core.js'
import { adapter, roots, type TestNode } from './fixtures.js'

describe('createTreeCollection', () => {
  it('indexes the complete immutable tree and preserves hierarchy metadata', () => {
    const collection = createTreeCollection(roots, adapter)

    expect(collection.size).toBe(6)
    expect(collection.rootIds).toEqual(['alpha', 'beta', 'gamma'])
    expect(collection.getNode('alpha-two-a')).toMatchObject({
      childrenIds: [],
      hasChildren: false,
      level: 3,
      parentId: 'alpha-two',
      positionInSet: 1,
      setSize: 1,
      textValue: 'Alpha two A',
    })
    expect(Object.isFrozen(collection.getNode('alpha'))).toBe(true)
    expect(Object.isFrozen(collection.rootIds)).toBe(true)
  })

  it('flattens only expanded branches with stable visible parent indexes', () => {
    const collection = createTreeCollection(roots, adapter)

    const collapsed = collection.getVisibleItems(new Set())
    const expanded = collection.getVisibleItems(new Set(['alpha', 'alpha-two']))

    expect(collapsed.map((item) => item.id)).toEqual(['alpha', 'beta', 'gamma'])
    expect(expanded).toMatchObject([
      {
        id: 'alpha',
        index: 0,
        isExpanded: true,
        parentIndex: null,
      },
      {
        id: 'alpha-one',
        index: 1,
        isExpanded: false,
        parentIndex: 0,
      },
      {
        id: 'alpha-two',
        index: 2,
        isExpanded: true,
        parentIndex: 0,
      },
      {
        id: 'alpha-two-a',
        index: 3,
        isExpanded: false,
        parentIndex: 2,
      },
      { id: 'beta', index: 4, parentIndex: null },
      { id: 'gamma', index: 5, parentIndex: null },
    ])
    expect(Object.isFrozen(expanded)).toBe(true)
    expect(Object.isFrozen(expanded[0])).toBe(true)
  })

  it('ignores expansion IDs that do not identify a branch', () => {
    const collection = createTreeCollection(roots, adapter)

    expect(
      collection
        .getVisibleItems(new Set(['missing', 'beta']))
        .map((item) => item.id),
    ).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('rejects duplicate IDs, cycles, invalid IDs, labels, and children', () => {
    const duplicate: readonly TestNode[] = [
      { children: [], id: 'same', label: 'One' },
      { children: [], id: 'same', label: 'Two' },
    ]
    const cyclic = { children: [], id: 'cycle', label: 'Cycle' } as {
      children: TestNode[]
      id: string
      label: string
    }
    cyclic.children.push(cyclic)

    expectCollectionError(duplicate, adapter, 'duplicate-id')
    expectCollectionError([cyclic], adapter, 'cycle')
    expectCollectionError(
      [{ children: [], id: ' ', label: 'Invalid' }],
      adapter,
      'invalid-id',
    )
    expectCollectionError(
      [{ children: [], id: 'valid', label: ' ' }],
      adapter,
      'invalid-text-value',
    )
    expectCollectionError(
      [{ children: [], id: 'valid', label: 'Valid' }],
      {
        ...adapter,
        getTextValue: () => null as unknown as string,
      },
      'invalid-text-value',
    )
    expectCollectionError(
      [{ children: [], id: 'valid', label: 'Valid' }],
      {
        ...adapter,
        getId: () => null as unknown as string,
      },
      'invalid-id',
    )
    expectCollectionError(
      [{ children: [], id: 'valid', label: 'Valid' }],
      {
        ...adapter,
        getChildren: () => null as unknown as readonly TestNode[],
      },
      'invalid-children',
    )
    expectCollectionError(
      null as unknown as readonly TestNode[],
      adapter,
      'invalid-children',
    )
  })

  it('handles deep trees without recursive traversal', () => {
    let node: TestNode = { children: [], id: 'leaf', label: 'Leaf' }
    for (let depth = 2_000; depth > 0; depth -= 1) {
      node = {
        children: [node],
        id: `depth-${depth}`,
        label: `Depth ${depth}`,
      }
    }

    const collection = createTreeCollection([node], adapter)

    expect(collection.size).toBe(2_001)
    expect(collection.getNode('leaf')?.level).toBe(2_001)
  })
})

function expectCollectionError(
  nodes: readonly TestNode[],
  treeAdapter: TreeAdapter<TestNode>,
  code: TreeCollectionError['code'],
): void {
  try {
    createTreeCollection(nodes, treeAdapter)
    throw new Error(`Expected TreeCollectionError with code ${code}.`)
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect((error as TreeCollectionError).code).toBe(code)
  }
}
