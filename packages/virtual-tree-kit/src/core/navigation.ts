import type { TreeId, VisibleTreeItem } from './tree-collection.js'

export type TreeNavigationCommand =
  'first-child' | 'first' | 'last' | 'next' | 'parent' | 'previous'

export interface TreeExpansionIntent {
  readonly expanded: boolean
  readonly id: TreeId
}

export interface TreeNavigationResult {
  readonly activeIndex: number | null
  readonly expansion: TreeExpansionIntent | null
}

export function resolveTreeNavigation<T>(
  items: readonly VisibleTreeItem<T>[],
  activeIndex: number | null,
  command: TreeNavigationCommand,
): TreeNavigationResult {
  if (items.length === 0) {
    return { activeIndex: null, expansion: null }
  }

  const index = normalizeActiveIndex(activeIndex, items.length)
  const item = items[index] as VisibleTreeItem<T>

  switch (command) {
    case 'first':
      return result(0)
    case 'last':
      return result(items.length - 1)
    case 'next':
      return result(Math.min(index + 1, items.length - 1))
    case 'previous':
      return result(Math.max(index - 1, 0))
    case 'first-child':
      if (item.hasChildren && !item.isExpanded) {
        return {
          activeIndex: index,
          expansion: { expanded: true, id: item.id },
        }
      }
      return result(
        item.isExpanded && items[index + 1]?.parentIndex === index
          ? index + 1
          : index,
      )
    case 'parent':
      if (item.hasChildren && item.isExpanded) {
        return {
          activeIndex: index,
          expansion: { expanded: false, id: item.id },
        }
      }
      return result(item.parentIndex ?? index)
  }
}

export function findTypeaheadMatch<T>(
  items: readonly VisibleTreeItem<T>[],
  activeIndex: number | null,
  query: string,
  locale?: string,
): number | null {
  if (items.length === 0) {
    return null
  }

  const normalizedQuery = normalizeText(query, locale).trim()
  if (normalizedQuery.length === 0) {
    return normalizeActiveIndex(activeIndex, items.length)
  }

  const startIndex =
    activeIndex === null || activeIndex < 0 || activeIndex >= items.length
      ? 0
      : (activeIndex + 1) % items.length

  for (let offset = 0; offset < items.length; offset += 1) {
    const index = (startIndex + offset) % items.length
    const item = items[index] as VisibleTreeItem<T>
    if (normalizeText(item.textValue, locale).startsWith(normalizedQuery)) {
      return index
    }
  }

  return normalizeActiveIndex(activeIndex, items.length)
}

function normalizeActiveIndex(
  activeIndex: number | null,
  itemCount: number,
): number {
  if (activeIndex === null || activeIndex < 0 || activeIndex >= itemCount) {
    return 0
  }
  return activeIndex
}

function normalizeText(value: string, locale?: string): string {
  const normalized = value.normalize('NFKD').replace(/\p{M}/gu, '')
  return locale
    ? normalized.toLocaleLowerCase(locale)
    : normalized.toLocaleLowerCase()
}

function result(activeIndex: number): TreeNavigationResult {
  return { activeIndex, expansion: null }
}
