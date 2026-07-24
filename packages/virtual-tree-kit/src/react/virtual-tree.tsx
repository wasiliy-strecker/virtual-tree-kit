import type { CSSProperties, ReactNode } from 'react'

import type { VisibleTreeItem } from '../core.js'
import {
  useVirtualTree,
  type UseVirtualTreeOptions,
  type VirtualTreeHookResult,
  type VirtualTreeRow,
} from './use-virtual-tree.js'

export interface VirtualTreeItemRenderProps<T> {
  readonly isActive: boolean
  readonly isExpanded: boolean
  readonly isSelected: boolean
  readonly item: T
  readonly node: VisibleTreeItem<T>
}

export interface VirtualTreeProps<T> extends UseVirtualTreeOptions<T> {
  readonly className?: string
  readonly renderItem: (props: VirtualTreeItemRenderProps<T>) => ReactNode
  readonly style?: CSSProperties
}

export function VirtualTree<T>({
  className,
  renderItem,
  style,
  ...options
}: VirtualTreeProps<T>) {
  const tree = useVirtualTree(options)
  const treeProps = tree.getTreeProps()
  const spacerProps = tree.getSpacerProps()

  return (
    <div
      {...treeProps}
      className={className}
      style={{ ...style, ...treeProps.style }}
    >
      <div {...spacerProps}>
        {tree.rows.map((row) => (
          <VirtualTreeItem
            key={row.node.id}
            renderItem={renderItem}
            row={row}
            tree={tree}
          />
        ))}
      </div>
    </div>
  )
}

function VirtualTreeItem<T>({
  renderItem,
  row,
  tree,
}: {
  readonly renderItem: VirtualTreeProps<T>['renderItem']
  readonly row: VirtualTreeRow<T>
  readonly tree: VirtualTreeHookResult<T>
}) {
  const { node } = row
  const itemProps = tree.getItemProps(row)
  const isActive = node.id === tree.activeId
  const isSelected = node.id === tree.selectedId

  return (
    <div {...itemProps}>
      <span
        aria-hidden="true"
        data-virtual-tree-disclosure={node.hasChildren ? '' : undefined}
        onClick={
          node.hasChildren
            ? (event) => {
                event.stopPropagation()
                tree.toggle(node.id)
              }
            : undefined
        }
        onMouseDown={
          node.hasChildren
            ? (event) => {
                event.preventDefault()
              }
            : undefined
        }
        style={{
          display: 'inline-block',
          marginInlineStart: `${Math.max(0, node.level - 1) * 1.25}rem`,
          textAlign: 'center',
          width: '1.25rem',
        }}
      >
        {node.hasChildren ? (node.isExpanded ? '▾' : '▸') : ''}
      </span>
      {renderItem({
        isActive,
        isExpanded: node.isExpanded,
        isSelected,
        item: node.item,
        node,
      })}
    </div>
  )
}
