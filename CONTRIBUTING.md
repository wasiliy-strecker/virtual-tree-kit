# Contributing

Virtual Tree Kit is organized around observable component guarantees. Changes
should explain the affected keyboard behavior, accessibility semantics, render
bound, or public API contract.

## Local verification

Use Node.js 24 and pnpm 11 when possible.

```bash
pnpm install --frozen-lockfile
pnpm verify
```

## Change guidelines

- Keep tree and virtualization math independent from React.
- Preserve stable node identity across expansion and scrolling.
- Treat keyboard focus and selection as separate state.
- Prefer semantic assertions over machine-specific timing thresholds.
- Document deliberate limits rather than implying unsupported behavior.

Pull requests should identify the protected invariant and its executable proof.
