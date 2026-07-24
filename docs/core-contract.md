# Core tree and virtualization contract

The `/core` entry point contains no React imports. It turns nested application
data into an indexed immutable collection, derives visible rows from expansion
state, resolves tree navigation intents, and calculates the bounded range that
a renderer should mount.

## Data adapter

Consumers retain ownership of their node type and provide three pure accessors:

```ts
import { createTreeCollection } from 'virtual-tree-kit/core'

const collection = createTreeCollection(files, {
  getChildren: (file) => file.children,
  getId: (file) => file.path,
  getTextValue: (file) => file.name,
})
```

Construction indexes the complete hierarchy once. IDs and text values must be
non-empty strings, children must be arrays, IDs must be globally unique, and a
node cannot appear in its own descendant path. Invalid data throws a
`TreeCollectionError` with a stable code.

The traversal is iterative, so deeply nested input does not consume the
JavaScript call stack. Collection nodes, child ID arrays, visible rows, and
returned arrays are frozen.

## Visible projection

`collection.getVisibleItems(expandedIds)` returns depth-first rows with the
metadata needed by a tree renderer:

- one-based `level`, `positionInSet`, and `setSize`
- stable `id`, `parentId`, and original `item`
- constant-time `parentIndex` for left-arrow navigation
- `hasChildren` and expansion state

Unknown expansion IDs and expansion IDs for leaves have no effect. Creating the
collection costs `O(N)` time and memory for all nodes. A visible projection
costs `O(V)`, where `V` is the number of currently visible nodes.

## Navigation

`resolveTreeNavigation` is a state-free interpretation of the WAI-ARIA tree
keyboard model:

| Intent        | Expected key | Result                                             |
| ------------- | ------------ | -------------------------------------------------- |
| `next`        | Down Arrow   | next visible row, clamped at the end               |
| `previous`    | Up Arrow     | previous visible row, clamped at the beginning     |
| `first`       | Home         | first visible row                                  |
| `last`        | End          | last visible row                                   |
| `first-child` | Right Arrow  | expand a closed branch, then enter its first child |
| `parent`      | Left Arrow   | collapse an open branch, then move to its parent   |

Expansion is returned as an explicit intent instead of mutating a set.
`findTypeaheadMatch` performs case- and accent-insensitive prefix matching,
starts after the active row, and wraps once.

## Fixed-row virtualization

```ts
const range = calculateVirtualRange({
  itemCount: visibleItems.length,
  overscan: 4,
  rowHeight: 32,
  scrollOffset,
  viewportHeight: 480,
})
```

The result contains the total scroll size and only the consecutive rows
intersecting the viewport plus bounded overscan. Scroll input is clamped to the
valid collection range. `getScrollOffsetForIndex` supports nearest, start,
center, and end alignment.

Fixed height is a deliberate `v0.1.0` constraint. It makes range calculation
deterministic and prevents measurement changes from moving the active
descendant while keyboard navigation is in progress.
