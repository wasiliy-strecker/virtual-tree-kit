import type { TreeAdapter } from '../src/core.js'

export interface TestNode {
  readonly children: readonly TestNode[]
  readonly id: string
  readonly label: string
}

export const adapter: TreeAdapter<TestNode> = {
  getChildren: (node) => node.children,
  getId: (node) => node.id,
  getTextValue: (node) => node.label,
}

export const roots: readonly TestNode[] = [
  {
    children: [
      { children: [], id: 'alpha-one', label: 'Álpha one' },
      {
        children: [{ children: [], id: 'alpha-two-a', label: 'Alpha two A' }],
        id: 'alpha-two',
        label: 'Alpha two',
      },
    ],
    id: 'alpha',
    label: 'Alpha',
  },
  { children: [], id: 'beta', label: 'Beta' },
  { children: [], id: 'gamma', label: 'Gamma' },
]
