import { expectAssignable, expectError, expectType } from 'tsd'
import type { ReactNode } from 'react'

import {
  VirtualTree,
  type TreeId,
  type UseVirtualTreeOptions,
  type VirtualTreeRow,
  useVirtualTree,
} from 'virtual-tree-kit'
import {
  calculateVirtualRange,
  createTreeCollection,
  type TreeCollection,
  type VirtualRange,
} from 'virtual-tree-kit/core'

interface FileNode {
  readonly children: readonly FileNode[]
  readonly id: string
  readonly name: string
}

const files: readonly FileNode[] = [
  {
    children: [],
    id: 'readme',
    name: 'README.md',
  },
]

const options = {
  ariaLabel: 'Repository files',
  getChildren: (file: FileNode) => file.children,
  getId: (file: FileNode) => file.id,
  getTextValue: (file: FileNode) => file.name,
  items: files,
  rowHeight: 32,
  viewportHeight: 320,
} satisfies UseVirtualTreeOptions<FileNode>

const tree = useVirtualTree(options)

expectType<TreeId | null>(tree.activeId)
expectType<ReadonlySet<TreeId>>(tree.expandedIds)
expectType<readonly VirtualTreeRow<FileNode>[]>(tree.rows)
expectType<void>(tree.scrollTo('readme', 'center'))
expectType<void>(tree.select('readme'))
expectType<void>(tree.toggle('readme'))

expectAssignable<ReactNode>(
  VirtualTree({
    ...options,
    renderItem: ({ item, node }) => `${node.level}: ${item.name}`,
  }),
)

expectAssignable<UseVirtualTreeOptions<FileNode>>({
  ...options,
  expandedIds: new Set<TreeId>(['readme']),
  onExpandedChange: (expandedIds) => {
    expectType<ReadonlySet<TreeId>>(expandedIds)
  },
  onSelectionChange: (id, item) => {
    expectType<TreeId>(id)
    expectType<FileNode>(item)
  },
  selectedId: 'readme',
})

expectError(
  useVirtualTree({
    ...options,
    rowHeight: '32px',
  }),
)

expectType<TreeCollection<FileNode>>(
  createTreeCollection(files, {
    getChildren: (file) => file.children,
    getId: (file) => file.id,
    getTextValue: (file) => file.name,
  }),
)

expectType<VirtualRange>(
  calculateVirtualRange({
    itemCount: 10_000,
    overscan: 3,
    rowHeight: 32,
    scrollOffset: 4_000,
    viewportHeight: 320,
  }),
)
