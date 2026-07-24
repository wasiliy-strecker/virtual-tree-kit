# Virtual Tree Kit

[![CI](https://github.com/wasiliy-strecker/virtual-tree-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/wasiliy-strecker/virtual-tree-kit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Headless, accessible virtualized tree primitives for React, built for large
hierarchies and predictable keyboard focus.

The first release is intentionally focused: fixed-height rows, single
selection, controlled or uncontrolled expansion, WAI-ARIA tree keyboard
navigation, typeahead, and bounded DOM rendering. Multi-selection,
drag-and-drop, variable row heights, and asynchronous child loading are outside
the `v0.1.0` contract.

## Development

Requirements are Node.js 22.12 or newer and pnpm 11.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Run the interactive showcase with `pnpm demo:dev`, or open the
[hosted 50,000-node demo](https://wasiliy-strecker.github.io/virtual-tree-kit/).
Browser evidence runs with `pnpm test:e2e`.

## Framework-independent core

The current `/core` entry point provides an immutable tree collection,
WAI-ARIA-aligned navigation decisions, accent-insensitive typeahead, fixed-row
virtual range calculation, and scroll alignment. It is independently usable
without React:

```ts
import {
  calculateVirtualRange,
  createTreeCollection,
} from 'virtual-tree-kit/core'
```

See the [core contract](docs/core-contract.md) for invariants, complexity, and
deliberate limits.

## React primitives

The package root exposes the headless `useVirtualTree` hook and the unstyled
`VirtualTree` reference component. Both support controlled or uncontrolled
expansion and selection, predictable active-descendant focus, full tree
keyboard navigation, typeahead, and bounded DOM rendering.

See the [React contract](docs/react-contract.md) for usage, state ownership,
accessibility semantics, and deliberate limits.

## Evidence

The default showcase projects 50,000 visible nodes into at most 24 mounted
rows. Chromium tests verify the DOM bound, 1,600,000 px scroll extent, keyboard
focus, typeahead, controlled selection, fixture resizing, and a zero-violation
Axe scan. See [scale and browser evidence](docs/scale-evidence.md) for the
testable claims and commands.

## License

[MIT](LICENSE)
