export type TreeId = string

export interface TreeAdapter<T> {
  readonly getChildren: (item: T) => readonly T[]
  readonly getId: (item: T) => TreeId
  readonly getTextValue: (item: T) => string
}

export interface TreeCollectionNode<T> {
  readonly childrenIds: readonly TreeId[]
  readonly hasChildren: boolean
  readonly id: TreeId
  readonly item: T
  readonly level: number
  readonly parentId: TreeId | null
  readonly positionInSet: number
  readonly setSize: number
  readonly textValue: string
}

export interface VisibleTreeItem<T> extends TreeCollectionNode<T> {
  readonly index: number
  readonly isExpanded: boolean
  readonly parentIndex: number | null
}

export interface TreeCollection<T> {
  readonly rootIds: readonly TreeId[]
  readonly size: number
  getNode(id: TreeId): TreeCollectionNode<T> | undefined
  getVisibleItems(
    expandedIds: ReadonlySet<TreeId>,
  ): readonly VisibleTreeItem<T>[]
}

export type TreeCollectionErrorCode =
  | 'cycle'
  | 'duplicate-id'
  | 'invalid-children'
  | 'invalid-id'
  | 'invalid-text-value'

export class TreeCollectionError extends Error {
  constructor(
    readonly code: TreeCollectionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'TreeCollectionError'
  }
}

interface VisitFrame<T> {
  readonly id: TreeId
  readonly item: T
  readonly kind: 'visit'
  readonly level: number
  readonly parentId: TreeId | null
  readonly positionInSet: number
  readonly setSize: number
}

interface ExitFrame {
  readonly id: TreeId
  readonly kind: 'exit'
}

type TraversalFrame<T> = ExitFrame | VisitFrame<T>

interface VisibleFrame {
  readonly id: TreeId
  readonly parentIndex: number | null
}

export function createTreeCollection<T>(
  roots: readonly T[],
  adapter: TreeAdapter<T>,
): TreeCollection<T> {
  if (!Array.isArray(roots)) {
    throw new TreeCollectionError(
      'invalid-children',
      'Tree roots must be an array.',
    )
  }

  const rootFrames = createVisitFrames(roots, null, 1, adapter)
  const rootIds = Object.freeze(rootFrames.map((frame) => frame.id))
  const nodes = new Map<TreeId, TreeCollectionNode<T>>()
  const activePath = new Set<TreeId>()
  const stack: Array<TraversalFrame<T>> = []

  pushInReverse(stack, rootFrames)

  while (stack.length > 0) {
    const frame = stack.pop() as TraversalFrame<T>

    if (frame.kind === 'exit') {
      activePath.delete(frame.id)
      continue
    }

    if (activePath.has(frame.id)) {
      throw new TreeCollectionError(
        'cycle',
        `Tree node "${frame.id}" creates a cycle.`,
      )
    }
    if (nodes.has(frame.id)) {
      throw new TreeCollectionError(
        'duplicate-id',
        `Tree node ID "${frame.id}" is not unique.`,
      )
    }

    const textValue = adapter.getTextValue(frame.item)
    if (typeof textValue !== 'string' || textValue.trim().length === 0) {
      throw new TreeCollectionError(
        'invalid-text-value',
        `Tree node "${frame.id}" must have a non-empty text value.`,
      )
    }

    const children = adapter.getChildren(frame.item)
    if (!Array.isArray(children)) {
      throw new TreeCollectionError(
        'invalid-children',
        `Children for tree node "${frame.id}" must be an array.`,
      )
    }

    const childFrames = createVisitFrames(
      children,
      frame.id,
      frame.level + 1,
      adapter,
    )
    const node = Object.freeze({
      childrenIds: Object.freeze(childFrames.map((child) => child.id)),
      hasChildren: childFrames.length > 0,
      id: frame.id,
      item: frame.item,
      level: frame.level,
      parentId: frame.parentId,
      positionInSet: frame.positionInSet,
      setSize: frame.setSize,
      textValue,
    }) satisfies TreeCollectionNode<T>

    nodes.set(frame.id, node)
    activePath.add(frame.id)
    stack.push({ id: frame.id, kind: 'exit' })
    pushInReverse(stack, childFrames)
  }

  return new ImmutableTreeCollection(rootIds, nodes)
}

class ImmutableTreeCollection<T> implements TreeCollection<T> {
  readonly size: number

  constructor(
    readonly rootIds: readonly TreeId[],
    private readonly nodes: ReadonlyMap<TreeId, TreeCollectionNode<T>>,
  ) {
    this.size = nodes.size
  }

  getNode(id: TreeId): TreeCollectionNode<T> | undefined {
    return this.nodes.get(id)
  }

  getVisibleItems(
    expandedIds: ReadonlySet<TreeId>,
  ): readonly VisibleTreeItem<T>[] {
    const visible: Array<VisibleTreeItem<T>> = []
    const stack: VisibleFrame[] = []

    for (let index = this.rootIds.length - 1; index >= 0; index -= 1) {
      const id = this.rootIds[index] as TreeId
      stack.push({ id, parentIndex: null })
    }

    while (stack.length > 0) {
      const frame = stack.pop() as VisibleFrame
      const node = this.nodes.get(frame.id) as TreeCollectionNode<T>

      const index = visible.length
      const isExpanded = node.hasChildren && expandedIds.has(node.id)
      visible.push(
        Object.freeze({
          ...node,
          index,
          isExpanded,
          parentIndex: frame.parentIndex,
        }),
      )

      if (!isExpanded) {
        continue
      }

      for (
        let childIndex = node.childrenIds.length - 1;
        childIndex >= 0;
        childIndex -= 1
      ) {
        const id = node.childrenIds[childIndex] as TreeId
        stack.push({ id, parentIndex: index })
      }
    }

    return Object.freeze(visible)
  }
}

function createVisitFrames<T>(
  items: readonly T[],
  parentId: TreeId | null,
  level: number,
  adapter: TreeAdapter<T>,
): Array<VisitFrame<T>> {
  const setSize = items.length
  return items.map((item, index) => ({
    id: readId(item, adapter),
    item,
    kind: 'visit',
    level,
    parentId,
    positionInSet: index + 1,
    setSize,
  }))
}

function readId<T>(item: T, adapter: TreeAdapter<T>): TreeId {
  const id = adapter.getId(item)
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TreeCollectionError(
      'invalid-id',
      'Every tree node must have a non-empty string ID.',
    )
  }
  return id
}

function pushInReverse<T>(
  target: Array<TraversalFrame<T>>,
  frames: ReadonlyArray<VisitFrame<T>>,
): void {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    target.push(frames[index] as VisitFrame<T>)
  }
}
