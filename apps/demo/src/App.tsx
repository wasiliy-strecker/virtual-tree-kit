import { useMemo, useState } from 'react'
import {
  useVirtualTree,
  type TreeId,
  type VirtualTreeRow,
} from 'virtual-tree-kit'

import {
  createRepositoryFixture,
  type RepositoryFixture,
  type RepositoryNode,
} from './repository-data.js'

const datasetSizes = [1_000, 10_000, 50_000] as const
const rowHeight = 32
const viewportHeight = 512

export function App() {
  const [nodeCount, setNodeCount] = useState<number>(50_000)
  const dataset = useMemo(() => {
    const startedAt = performance.now()
    const fixture = createRepositoryFixture(nodeCount)
    return {
      fixture,
      generatedInMs: performance.now() - startedAt,
    }
  }, [nodeCount])

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#showcase" aria-label="Virtual Tree Kit">
          <MarkIcon />
          <span>virtual-tree-kit</span>
        </a>
        <div className="header-actions">
          <span className="version-pill">v0.1 candidate</span>
          <a
            className="github-link"
            href="https://github.com/wasiliy-strecker/virtual-tree-kit"
          >
            View source
            <ArrowUpRightIcon />
          </a>
        </div>
      </header>

      <main id="showcase">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="signal-dot" />
              Headless React primitives
            </p>
            <h1 id="hero-title">
              Scale without
              <span> losing focus.</span>
            </h1>
            <p className="hero-summary">
              Accessible tree navigation over 50,000 typed nodes with a stable
              focus model and a deliberately tiny DOM.
            </p>
          </div>
          <div className="hero-proof" aria-label="Library characteristics">
            <ProofItem value="0" label="runtime dependencies" />
            <ProofItem value="98%" label="branch coverage" />
            <ProofItem value="2" label="package entry points" />
          </div>
        </section>

        <section className="showcase-grid" aria-label="Interactive showcase">
          <div className="tree-card">
            <div className="card-heading">
              <div>
                <p className="section-kicker">Live repository fixture</p>
                <h2>Bounded DOM explorer</h2>
              </div>
              <div
                className="dataset-switcher"
                aria-label="Dataset size"
                role="group"
              >
                {datasetSizes.map((size) => (
                  <button
                    aria-pressed={nodeCount === size}
                    key={size}
                    onClick={() => {
                      setNodeCount(size)
                    }}
                    type="button"
                  >
                    {formatCompact(size)}
                  </button>
                ))}
              </div>
            </div>

            <RepositoryExplorer
              fixture={dataset.fixture}
              generatedInMs={dataset.generatedInMs}
              key={dataset.fixture.nodeCount}
            />
          </div>

          <aside
            className="evidence-column"
            aria-label="Implementation evidence"
          >
            <section className="evidence-card keyboard-card">
              <p className="section-kicker">Keyboard contract</p>
              <h2>One focus target</h2>
              <p>
                DOM focus stays on the tree. Navigation updates a mounted active
                descendant and never strands focus on a recycled row.
              </p>
              <dl className="shortcut-list">
                <Shortcut keys={['↑', '↓']} label="Previous / next" />
                <Shortcut keys={['←', '→']} label="Parent / child" />
                <Shortcut keys={['Home', 'End']} label="First / last" />
                <Shortcut keys={['A–Z']} label="Typeahead" />
                <Shortcut keys={['Enter']} label="Select" />
              </dl>
            </section>

            <section className="evidence-card api-card">
              <div className="api-card-heading">
                <div>
                  <p className="section-kicker">Public API</p>
                  <h2>Data stays yours</h2>
                </div>
                <span>TS</span>
              </div>
              <pre aria-label="TypeScript hook example">
                <code>
                  <span className="code-purple">const</span> tree ={' '}
                  <span className="code-green">useVirtualTree</span>
                  {'({\n'}
                  {'  '}items,{'\n'}
                  {'  '}getId: node {'=>'} node.path,{'\n'}
                  {'  '}getChildren: node {'=>'} node.children,{'\n'}
                  {'  '}rowHeight: <span className="code-number">32</span>,
                  {'\n'}
                  {'  '}viewportHeight: <span className="code-number">512</span>
                  {'\n})'}
                </code>
              </pre>
            </section>
          </aside>
        </section>

        <section className="guarantees" aria-labelledby="guarantees-title">
          <div>
            <p className="section-kicker">Deliberate guarantees</p>
            <h2 id="guarantees-title">Small surface. Explicit behavior.</h2>
          </div>
          <div className="guarantee-grid">
            <Guarantee
              number="01"
              title="Headless"
              description="Prop getters expose behavior without dictating product styling."
            />
            <Guarantee
              number="02"
              title="Typed"
              description="Generic adapters preserve the application node type end to end."
            />
            <Guarantee
              number="03"
              title="Predictable"
              description="Fixed rows make range math and keyboard scroll alignment deterministic."
            />
          </div>
        </section>
      </main>

      <footer>
        <span>Built as a focused React systems exercise.</span>
        <span>MIT · ESM + CJS · React 18 / 19</span>
      </footer>
    </div>
  )
}

function RepositoryExplorer({
  fixture,
  generatedInMs,
}: {
  readonly fixture: RepositoryFixture
  readonly generatedInMs: number
}) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<TreeId>>(
    () => new Set(fixture.branchIds),
  )
  const [selectedId, setSelectedId] = useState<TreeId | null>(null)
  const tree = useVirtualTree({
    ariaLabel: 'Virtual Tree Kit repository files',
    expandedIds,
    getChildren: (node: RepositoryNode) => node.children,
    getId: (node: RepositoryNode) => node.id,
    getTextValue: (node: RepositoryNode) => node.label,
    items: fixture.items,
    onExpandedChange: setExpandedIds,
    onSelectionChange: setSelectedId,
    overscan: 4,
    rowHeight,
    selectedId,
    viewportHeight,
  })
  const treeProps = tree.getTreeProps()
  const activeNode =
    tree.activeId === null ? undefined : tree.collection.getNode(tree.activeId)
  const selectedNode =
    selectedId === null ? undefined : tree.collection.getNode(selectedId)
  const mountedRatio =
    tree.visibleItems.length === 0
      ? 0
      : (tree.rows.length / tree.visibleItems.length) * 100

  return (
    <>
      <div className="metric-strip">
        <Metric
          label="Indexed"
          testId="indexed-count"
          value={formatNumber(tree.collection.size)}
        />
        <Metric
          label="Visible"
          testId="visible-count"
          value={formatNumber(tree.visibleItems.length)}
        />
        <Metric
          label="DOM rows"
          testId="mounted-count"
          value={String(tree.rows.length)}
        />
        <Metric
          label="Mounted"
          testId="mounted-ratio"
          value={`${mountedRatio.toFixed(3)}%`}
        />
      </div>

      <div className="explorer-frame">
        <div className="explorer-toolbar">
          <div className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span className="fixture-path">~/virtual-tree-kit</span>
          <div className="tree-actions">
            <button
              onClick={() => {
                setExpandedIds(new Set(fixture.branchIds))
              }}
              type="button"
            >
              Expand all
            </button>
            <button
              onClick={() => {
                setExpandedIds(new Set(['virtual-tree-kit']))
              }}
              type="button"
            >
              Collapse
            </button>
          </div>
        </div>

        <div
          {...treeProps}
          className="repository-tree"
          data-testid="repository-tree"
          style={treeProps.style}
        >
          <div {...tree.getSpacerProps()}>
            {tree.rows.map((row) => (
              <RepositoryRow key={row.node.id} row={row} tree={tree} />
            ))}
          </div>
        </div>

        <div className="explorer-status">
          <div aria-live="polite" className="active-path">
            <span>{selectedNode ? 'Selected' : 'Active'}</span>
            <strong data-testid="active-path">
              {selectedNode?.item.path ??
                activeNode?.item.path ??
                'No active node'}
            </strong>
          </div>
          <span className="fixture-time">
            Fixture built in {generatedInMs.toFixed(1)} ms
          </span>
        </div>
      </div>
    </>
  )
}

function RepositoryRow({
  row,
  tree,
}: {
  readonly row: VirtualTreeRow<RepositoryNode>
  readonly tree: ReturnType<typeof useVirtualTree<RepositoryNode>>
}) {
  const { node } = row
  const itemProps = tree.getItemProps(row)

  return (
    <div
      {...itemProps}
      className="repository-row"
      data-kind={node.item.kind}
      style={itemProps.style}
    >
      <span
        aria-hidden="true"
        className="row-indent"
        style={{ width: `${Math.max(0, node.level - 1) * 18}px` }}
      />
      <span
        aria-hidden="true"
        className="disclosure"
        data-visible={node.hasChildren || undefined}
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
      >
        {node.isExpanded ? '⌄' : '›'}
      </span>
      <NodeIcon kind={node.item.kind} open={node.isExpanded} />
      <span className="node-label">{node.item.label}</span>
      {node.item.kind === 'folder' ? (
        <span className="child-count">{node.childrenIds.length}</span>
      ) : null}
    </div>
  )
}

function Metric({
  label,
  testId,
  value,
}: {
  readonly label: string
  readonly testId: string
  readonly value: string
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
    </div>
  )
}

function ProofItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Shortcut({
  keys,
  label,
}: {
  readonly keys: readonly string[]
  readonly label: string
}) {
  return (
    <div>
      <dt>
        {keys.map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </dt>
      <dd>{label}</dd>
    </div>
  )
}

function Guarantee({
  description,
  number,
  title,
}: {
  readonly description: string
  readonly number: string
  readonly title: string
}) {
  return (
    <article>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function NodeIcon({
  kind,
  open,
}: {
  readonly kind: RepositoryNode['kind']
  readonly open: boolean
}) {
  if (kind === 'folder') {
    return (
      <svg
        aria-hidden="true"
        className="node-icon folder-icon"
        viewBox="0 0 18 18"
      >
        <path
          d={
            open
              ? 'M2.2 5.6h13.6l-1.4 8H3.6l-1.4-8Zm1-2.6h4l1.2 1.4h6.4v1.2H3.2V3Z'
              : 'M2.4 3.2h4.8l1.2 1.5h7.2v9.1H2.4V3.2Z'
          }
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="node-icon file-icon" viewBox="0 0 18 18">
      <path d="M4 2.2h6.2L14 6v9.8H4V2.2Zm6 1.4V6h2.4L10 3.6Z" />
    </svg>
  )
}

function MarkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <rect height="28" rx="8" width="28" x="2" y="2" />
      <path d="M10 9h5v5h-5V9Zm7 0h5v5h-5V9Zm-7 9h5v5h-5v-5Zm7 0h5v5h-5v-5Z" />
    </svg>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M4 12 12 4m-6 0h6v6" />
    </svg>
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value)
}
