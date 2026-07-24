import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type RefCallback,
  type UIEvent,
} from 'react'

import {
  calculateVirtualRange,
  createTreeCollection,
  findTypeaheadMatch,
  getScrollOffsetForIndex,
  resolveTreeNavigation,
  type ScrollAlignment,
  type TreeAdapter,
  type TreeCollection,
  type TreeId,
  type TreeNavigationCommand,
  type VirtualItem,
  type VisibleTreeItem,
} from '../core.js'

const defaultOverscan = 3
const defaultTypeaheadResetMs = 500

export interface UseVirtualTreeOptions<T> extends TreeAdapter<T> {
  readonly ariaLabel: string
  readonly defaultExpandedIds?: Iterable<TreeId>
  readonly defaultSelectedId?: TreeId | null
  readonly expandedIds?: ReadonlySet<TreeId>
  readonly id?: string
  readonly items: readonly T[]
  readonly locale?: string
  readonly onExpandedChange?: (expandedIds: ReadonlySet<TreeId>) => void
  readonly onSelectionChange?: (id: TreeId, item: T) => void
  readonly overscan?: number
  readonly rowHeight: number
  readonly selectedId?: TreeId | null
  readonly typeaheadResetMs?: number
  readonly viewportHeight: number
}

export interface VirtualTreeRow<T> {
  readonly node: VisibleTreeItem<T>
  readonly virtualItem: VirtualItem
}

export interface VirtualTreeContainerProps extends HTMLAttributes<HTMLDivElement> {
  readonly ref: RefCallback<HTMLDivElement>
}

export type VirtualTreeSpacerProps = HTMLAttributes<HTMLDivElement>
export interface VirtualTreeItemProps extends HTMLAttributes<HTMLDivElement> {
  readonly 'data-active'?: string | undefined
  readonly 'data-index': number
}

export interface VirtualTreeHookResult<T> {
  readonly activeId: TreeId | null
  readonly collection: TreeCollection<T>
  readonly expandedIds: ReadonlySet<TreeId>
  readonly getItemProps: (row: VirtualTreeRow<T>) => VirtualTreeItemProps
  readonly getSpacerProps: () => VirtualTreeSpacerProps
  readonly getTreeProps: () => VirtualTreeContainerProps
  readonly rows: readonly VirtualTreeRow<T>[]
  readonly selectedId: TreeId | null
  readonly totalSize: number
  readonly visibleItems: readonly VisibleTreeItem<T>[]
  scrollTo: (id: TreeId, alignment?: ScrollAlignment) => void
  select: (id: TreeId) => void
  toggle: (id: TreeId) => void
}

export function useVirtualTree<T>(
  options: UseVirtualTreeOptions<T>,
): VirtualTreeHookResult<T> {
  const generatedId = useId()
  const treeId = options.id ?? `virtual-tree-${generatedId.replaceAll(':', '')}`
  const containerRef = useRef<HTMLDivElement | null>(null)
  const typeaheadBufferRef = useRef('')
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState(
    () => new Set(options.defaultExpandedIds ?? []),
  )
  const [uncontrolledSelectedId, setUncontrolledSelectedId] =
    useState<TreeId | null>(() => options.defaultSelectedId ?? null)
  const [preferredActiveId, setPreferredActiveId] = useState<TreeId | null>(
    () => options.defaultSelectedId ?? null,
  )
  const controlledExpandedIds = options.expandedIds
  const controlledSelectedId = options.selectedId
  const onExpandedChange = options.onExpandedChange
  const onSelectionChange = options.onSelectionChange

  const collection = useMemo(
    () =>
      createTreeCollection(options.items, {
        getChildren: options.getChildren,
        getId: options.getId,
        getTextValue: options.getTextValue,
      }),
    [options.getChildren, options.getId, options.getTextValue, options.items],
  )
  const expandedIds = controlledExpandedIds ?? uncontrolledExpandedIds
  const selectedId =
    controlledSelectedId === undefined
      ? uncontrolledSelectedId
      : controlledSelectedId
  const visibleItems = useMemo(
    () => collection.getVisibleItems(expandedIds),
    [collection, expandedIds],
  )
  const visibleIndexById = useMemo(
    () => new Map(visibleItems.map((item) => [item.id, item.index])),
    [visibleItems],
  )
  const activeIndex = resolveActiveIndex({
    collection,
    preferredActiveId,
    selectedId,
    visibleIndexById,
  })
  const activeId =
    activeIndex === null
      ? null
      : (visibleItems[activeIndex] as VisibleTreeItem<T>).id
  const virtualRange = calculateVirtualRange({
    itemCount: visibleItems.length,
    overscan: options.overscan ?? defaultOverscan,
    rowHeight: options.rowHeight,
    scrollOffset,
    viewportHeight: options.viewportHeight,
  })
  const rows = useMemo(
    () =>
      Object.freeze(
        virtualRange.items.map((virtualItem) =>
          Object.freeze({
            node: visibleItems[virtualItem.index] as VisibleTreeItem<T>,
            virtualItem,
          }),
        ),
      ),
    [virtualRange.items, visibleItems],
  )
  const mountedIndexes = useMemo(
    () => new Set(virtualRange.items.map((item) => item.index)),
    [virtualRange.items],
  )

  const setContainerRef = useCallback<RefCallback<HTMLDivElement>>(
    (element) => {
      containerRef.current = element
    },
    [],
  )

  const updateExpanded = useCallback(
    (id: TreeId, expanded: boolean) => {
      const next = new Set(expandedIds)
      if (expanded) {
        next.add(id)
      } else {
        next.delete(id)
      }

      if (controlledExpandedIds === undefined) {
        setUncontrolledExpandedIds(next)
      }
      onExpandedChange?.(next)
    },
    [controlledExpandedIds, expandedIds, onExpandedChange],
  )

  const toggle = useCallback(
    (id: TreeId) => {
      const node = collection.getNode(id)
      if (!node?.hasChildren) {
        return
      }
      updateExpanded(id, !expandedIds.has(id))
    },
    [collection, expandedIds, updateExpanded],
  )

  const select = useCallback(
    (id: TreeId) => {
      const node = collection.getNode(id)
      if (!node) {
        return
      }

      setPreferredActiveId(id)
      if (controlledSelectedId === undefined) {
        setUncontrolledSelectedId(id)
      }
      onSelectionChange?.(id, node.item)
    },
    [collection, controlledSelectedId, onSelectionChange],
  )

  const moveActive = useCallback(
    (nextIndex: number) => {
      const nextItem = visibleItems[nextIndex]
      if (!nextItem) {
        return
      }

      const element = containerRef.current
      const currentOffset = element?.scrollTop ?? scrollOffset
      const nextOffset = getScrollOffsetForIndex({
        currentOffset,
        index: nextIndex,
        itemCount: visibleItems.length,
        rowHeight: options.rowHeight,
        viewportHeight: options.viewportHeight,
      })
      if (element && element.scrollTop !== nextOffset) {
        element.scrollTop = nextOffset
      }
      if (nextOffset !== scrollOffset) {
        setScrollOffset(nextOffset)
      }
      setPreferredActiveId(nextItem.id)
    },
    [options.rowHeight, options.viewportHeight, scrollOffset, visibleItems],
  )

  const scrollTo = useCallback(
    (id: TreeId, alignment: ScrollAlignment = 'nearest') => {
      const index = visibleIndexById.get(id)
      if (index === undefined) {
        return
      }

      const element = containerRef.current
      const nextOffset = getScrollOffsetForIndex({
        alignment,
        currentOffset: element?.scrollTop ?? scrollOffset,
        index,
        itemCount: visibleItems.length,
        rowHeight: options.rowHeight,
        viewportHeight: options.viewportHeight,
      })
      if (element) {
        element.scrollTop = nextOffset
      }
      setScrollOffset(nextOffset)
    },
    [
      options.rowHeight,
      options.viewportHeight,
      scrollOffset,
      visibleIndexById,
      visibleItems.length,
    ],
  )

  const handleNavigation = useCallback(
    (command: TreeNavigationCommand) => {
      const result = resolveTreeNavigation(visibleItems, activeIndex, command)
      if (result.expansion) {
        updateExpanded(result.expansion.id, result.expansion.expanded)
      }
      if (result.activeIndex !== null) {
        moveActive(result.activeIndex)
      }
    },
    [activeIndex, moveActive, updateExpanded, visibleItems],
  )

  const handleTypeahead = useCallback(
    (character: string) => {
      const candidate = `${typeaheadBufferRef.current}${character}`
      const search = allCharactersMatch(candidate) ? character : candidate
      typeaheadBufferRef.current = candidate

      if (typeaheadTimerRef.current) {
        globalThis.clearTimeout(typeaheadTimerRef.current)
      }
      typeaheadTimerRef.current = globalThis.setTimeout(() => {
        typeaheadBufferRef.current = ''
        typeaheadTimerRef.current = null
      }, options.typeaheadResetMs ?? defaultTypeaheadResetMs)

      const match = findTypeaheadMatch(
        visibleItems,
        activeIndex,
        search,
        options.locale,
      )
      if (match !== null) {
        moveActive(match)
      }
    },
    [
      activeIndex,
      moveActive,
      options.locale,
      options.typeaheadResetMs,
      visibleItems,
    ],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const command = getNavigationCommand(event.key)
      if (command) {
        event.preventDefault()
        handleNavigation(command)
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (activeId) {
          select(activeId)
        }
        return
      }

      if (
        event.key.length === 1 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.nativeEvent.isComposing
      ) {
        handleTypeahead(event.key)
      }
    },
    [activeId, handleNavigation, handleTypeahead, select],
  )

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollOffset(event.currentTarget.scrollTop)
  }, [])

  useEffect(() => {
    if (activeId !== preferredActiveId) {
      setPreferredActiveId(activeId)
    }
  }, [activeId, preferredActiveId])

  useEffect(() => {
    if (
      activeId !== null &&
      activeIndex !== null &&
      !mountedIndexes.has(activeIndex)
    ) {
      scrollTo(activeId)
    }
  }, [activeId, activeIndex, mountedIndexes, scrollTo])

  useEffect(
    () => () => {
      if (typeaheadTimerRef.current) {
        globalThis.clearTimeout(typeaheadTimerRef.current)
      }
    },
    [],
  )

  const getTreeProps = useCallback(
    (): VirtualTreeContainerProps => ({
      'aria-activedescendant':
        activeIndex !== null && mountedIndexes.has(activeIndex)
          ? getItemDomId(treeId, activeIndex)
          : undefined,
      'aria-label': options.ariaLabel,
      onKeyDown,
      onScroll,
      ref: setContainerRef,
      role: 'tree',
      style: {
        height: options.viewportHeight,
        overflow: 'auto',
        position: 'relative',
      },
      tabIndex: 0,
    }),
    [
      activeIndex,
      mountedIndexes,
      onKeyDown,
      onScroll,
      options.ariaLabel,
      options.viewportHeight,
      setContainerRef,
      treeId,
    ],
  )

  const getSpacerProps = useCallback(
    (): VirtualTreeSpacerProps => ({
      role: 'presentation',
      style: {
        height: virtualRange.totalSize,
        position: 'relative',
      },
    }),
    [virtualRange.totalSize],
  )

  const getItemProps = useCallback(
    (row: VirtualTreeRow<T>): VirtualTreeItemProps => {
      const { node, virtualItem } = row
      return {
        'aria-expanded': node.hasChildren ? node.isExpanded : undefined,
        'aria-level': node.level,
        'aria-posinset': node.positionInSet,
        'aria-selected': node.id === selectedId,
        'aria-setsize': node.setSize,
        'data-active': node.id === activeId ? '' : undefined,
        'data-index': node.index,
        id: getItemDomId(treeId, node.index),
        onClick: () => {
          containerRef.current?.focus({ preventScroll: true })
          moveActive(node.index)
          select(node.id)
        },
        role: 'treeitem',
        style: {
          height: virtualItem.size,
          left: 0,
          position: 'absolute',
          top: 0,
          transform: `translateY(${virtualItem.start}px)`,
          width: '100%',
        },
      }
    },
    [activeId, moveActive, select, selectedId, treeId],
  )

  return {
    activeId,
    collection,
    expandedIds,
    getItemProps,
    getSpacerProps,
    getTreeProps,
    rows,
    scrollTo,
    select,
    selectedId,
    toggle,
    totalSize: virtualRange.totalSize,
    visibleItems,
  }
}

interface ResolveActiveIndexOptions<T> {
  readonly collection: TreeCollection<T>
  readonly preferredActiveId: TreeId | null
  readonly selectedId: TreeId | null
  readonly visibleIndexById: ReadonlyMap<TreeId, number>
}

function resolveActiveIndex<T>({
  collection,
  preferredActiveId,
  selectedId,
  visibleIndexById,
}: ResolveActiveIndexOptions<T>): number | null {
  if (visibleIndexById.size === 0) {
    return null
  }

  const preferred = preferredActiveId ?? selectedId
  let candidate = preferred ? collection.getNode(preferred) : undefined
  while (candidate) {
    const index = visibleIndexById.get(candidate.id)
    if (index !== undefined) {
      return index
    }
    candidate = candidate.parentId
      ? collection.getNode(candidate.parentId)
      : undefined
  }

  const selectedIndex = selectedId
    ? visibleIndexById.get(selectedId)
    : undefined
  return selectedIndex ?? 0
}

function getNavigationCommand(key: string): TreeNavigationCommand | null {
  switch (key) {
    case 'ArrowDown':
      return 'next'
    case 'ArrowUp':
      return 'previous'
    case 'ArrowRight':
      return 'first-child'
    case 'ArrowLeft':
      return 'parent'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    default:
      return null
  }
}

function getItemDomId(treeId: string, index: number): string {
  return `${treeId}-item-${index}`
}

function allCharactersMatch(value: string): boolean {
  const first = value[0]
  return (
    first !== undefined && [...value].every((character) => character === first)
  )
}
