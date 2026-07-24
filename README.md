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

The public API, interactive demo, guarantees, and evidence will be documented
as each reviewable milestone lands.

## License

[MIT](LICENSE)
