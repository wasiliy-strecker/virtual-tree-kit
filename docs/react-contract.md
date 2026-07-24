# React contract

The package root exports two layers over the framework-independent core:

- `useVirtualTree` for fully headless rendering
- `VirtualTree` as a small, unstyled reference component

Both use a fixed-height virtualizer and keep DOM focus on one stable tree
container. Only the active descendant ID changes while users navigate.

## Reference component

```tsx
import { VirtualTree } from 'virtual-tree-kit'

function FileTree({ files }: { files: readonly FileNode[] }) {
  return (
    <VirtualTree
      ariaLabel="Repository files"
      defaultExpandedIds={['src']}
      getChildren={(file) => file.children}
      getId={(file) => file.path}
      getTextValue={(file) => file.name}
      items={files}
      overscan={4}
      renderItem={({ isSelected, item }) => (
        <span data-selected={isSelected || undefined}>{item.name}</span>
      )}
      rowHeight={32}
      viewportHeight={480}
    />
  )
}
```

`renderItem` owns row content, while the component owns tree semantics,
absolute positioning, indentation, and the disclosure target. It emits no
classes and can be styled through `className`, `style`, ARIA state, and data
attributes.

## Headless hook

`useVirtualTree` returns the collection, visible projection, mounted rows,
state, imperative actions, and prop getters. A custom renderer must spread all
three prop groups onto their corresponding elements:

```tsx
const tree = useVirtualTree(options)

return (
  <div {...tree.getTreeProps()}>
    <div {...tree.getSpacerProps()}>
      {tree.rows.map((row) => (
        <div key={row.node.id} {...tree.getItemProps(row)}>
          {row.node.item.name}
        </div>
      ))}
    </div>
  </div>
)
```

The tree prop getter supplies the scroll container, focus target, keyboard and
scroll handlers, accessible name, and `aria-activedescendant`. The spacer
creates the complete scroll extent. Item props provide `treeitem` semantics,
hierarchy metadata, selection state, absolute row placement, and pointer
selection.

## Focus and selection

Active focus and selection are separate:

- Arrow keys, Home, End, and typeahead move the active descendant.
- Right Arrow expands a closed branch or enters its first child.
- Left Arrow collapses an open branch or moves to its parent.
- Enter and Space select the active item.
- Clicking a row moves the active descendant and selects it.
- Clicking a disclosure target changes expansion without selecting the row.

Typeahead is case- and accent-insensitive, wraps once, and resets after 500 ms
by default. Repeating one character cycles through matching rows. The reset
duration and locale are configurable.

When a controlled selection or previously active item becomes hidden, the
nearest visible ancestor becomes active. A stale ID falls back to the first
visible row. Empty trees remain keyboard-focusable and omit
`aria-activedescendant`.

## Controlled and uncontrolled state

Expansion and single selection can be managed independently:

| Concern   | Uncontrolled input   | Controlled input | Notification        |
| --------- | -------------------- | ---------------- | ------------------- |
| Expansion | `defaultExpandedIds` | `expandedIds`    | `onExpandedChange`  |
| Selection | `defaultSelectedId`  | `selectedId`     | `onSelectionChange` |

Controlled expansion is immutable from the hook's perspective. The callback
receives a new `ReadonlySet` and the owner decides whether to render it.
Selection callbacks receive both the stable ID and the original typed item.

## Virtualization and accessibility

Only rows intersecting the viewport plus overscan are mounted. Each mounted
row still exposes `aria-level`, `aria-posinset`, `aria-setsize`,
`aria-expanded` where applicable, and `aria-selected`.

An active item is scrolled into the mounted range before its DOM ID is exposed
through `aria-activedescendant`. This avoids referencing an element that does
not exist. Row height and viewport height are explicit inputs, which keeps
keyboard focus and scroll alignment deterministic.

`scrollTo` operates on visible IDs and supports `nearest`, `start`, `center`,
and `end` alignment. `select` ignores unknown IDs, and `toggle` ignores unknown
IDs and leaves.

## Deliberate v0.1 limits

The first contract covers fixed-height rows, single selection, synchronous
hierarchies, and one tree container. Variable heights, multi-selection,
drag-and-drop, asynchronous child loading, and focusable controls inside rows
are intentionally deferred.
