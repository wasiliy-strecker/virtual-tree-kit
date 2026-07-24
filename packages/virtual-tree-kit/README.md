# virtual-tree-kit

Headless, accessible virtualized tree primitives for React.

```tsx
import { VirtualTree } from 'virtual-tree-kit'

;<VirtualTree
  ariaLabel="Repository files"
  getChildren={(file) => file.children}
  getId={(file) => file.path}
  getTextValue={(file) => file.name}
  items={files}
  renderItem={({ item }) => item.name}
  rowHeight={32}
  viewportHeight={480}
/>
```

Use `useVirtualTree` for fully custom rendering. Import
`virtual-tree-kit/core` for the React-free immutable collection, navigation,
typeahead, and fixed-row virtualizer.

- [Documentation and source](https://github.com/wasiliy-strecker/virtual-tree-kit)
- [Interactive 50,000-node demo](https://wasiliy-strecker.github.io/virtual-tree-kit/)
- [Release notes](https://github.com/wasiliy-strecker/virtual-tree-kit/releases)

React 18.3 and React 19 are supported.
