# Scale and browser evidence

The interactive demo uses the public headless hook against a deterministic
repository-shaped fixture. Its default scenario contains exactly 50,000 typed
nodes across four hierarchy levels. Every branch starts expanded, so all
50,000 nodes participate in the visible projection.

## Deterministic bounds

The showcase configures a 512 px viewport, 32 px fixed rows, and four rows of
overscan. At the beginning or end of the collection, 20 rows are mounted. In
the middle, no more than 24 rows can be mounted:

```text
16 viewport rows + 4 rows before + 4 rows after = 24 maximum DOM rows
```

The complete 50,000-row projection still exposes a 1,600,000 px scroll extent.
These are structural assertions rather than machine-dependent timing
thresholds.

## Automated Chromium scenarios

`e2e/showcase.spec.ts` verifies the following behavior in a real browser:

- 50,000 indexed and visible nodes produce 20 initial `treeitem` elements
- the virtual spacer exposes the complete 1,600,000 px scroll extent
- End scrolls to and mounts the last active descendant while focus stays on
  the tree container
- Home, Right Arrow, typeahead, and Enter update active and selected state
- switching fixture sizes rebuilds the typed collection without changing the
  viewport bound
- collapsing the fixture reduces both the visible model and rendered DOM
- a full-page Axe scan reports no automatically detectable violations

The browser workflow installs Chromium on a clean GitHub runner and executes
these scenarios for every pull request and every push to `main`.

## Run locally

```bash
pnpm demo:dev
```

In a separate terminal:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The demo also displays fixture construction time as an observation. It is not a
pass/fail gate because shared CI hardware and developer machines have different
performance characteristics.
