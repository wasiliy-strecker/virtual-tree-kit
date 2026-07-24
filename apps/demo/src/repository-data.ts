export type RepositoryNodeKind = 'file' | 'folder'

export interface RepositoryNode {
  readonly children: readonly RepositoryNode[]
  readonly id: string
  readonly kind: RepositoryNodeKind
  readonly label: string
  readonly path: string
}

export interface RepositoryFixture {
  readonly branchIds: readonly string[]
  readonly items: readonly RepositoryNode[]
  readonly nodeCount: number
}

interface MutableRepositoryNode {
  children: MutableRepositoryNode[]
  id: string
  kind: RepositoryNodeKind
  label: string
  path: string
}

const topLevelFolders = [
  'apps',
  'packages',
  'examples',
  'docs',
  'tooling',
  'integrations',
  'fixtures',
  'benchmarks',
] as const

const moduleNames = [
  'collection',
  'navigation',
  'selection',
  'typeahead',
  'virtualizer',
  'accessibility',
  'adapters',
  'observability',
] as const

const defaultExtensions = ['ts', 'test.ts'] as const

const extensionsByFolder: Readonly<Record<string, readonly string[]>> = {
  apps: ['tsx', 'css', 'test.tsx'],
  benchmarks: ['bench.ts', 'json'],
  docs: ['md', 'mdx'],
  examples: ['tsx', 'ts'],
  fixtures: ['json', 'ts'],
  integrations: ['ts', 'test.ts'],
  packages: defaultExtensions,
  tooling: ['ts', 'mjs'],
}

export function createRepositoryFixture(totalNodes: number): RepositoryFixture {
  if (!Number.isInteger(totalNodes) || totalNodes < 10) {
    throw new RangeError('totalNodes must be an integer of at least 10.')
  }

  const root = createMutableNode(
    'virtual-tree-kit',
    'virtual-tree-kit',
    'folder',
  )
  const branchIds: string[] = [root.id]
  const folderCount = Math.min(topLevelFolders.length, totalNodes - 1)
  const folders = topLevelFolders.slice(0, folderCount).map((name) => {
    const folder = createMutableNode(name, name, 'folder')
    root.children.push(folder)
    branchIds.push(folder.id)
    return folder
  })

  const nodesAfterFolders = totalNodes - 1 - folders.length
  const moduleCount = Math.min(
    640,
    nodesAfterFolders,
    Math.max(folders.length, Math.floor(nodesAfterFolders / 24)),
  )
  const modules: MutableRepositoryNode[] = []

  for (let index = 0; index < moduleCount; index += 1) {
    const parent = folders[index % folders.length] as MutableRepositoryNode
    const family = moduleNames[index % moduleNames.length]
    const label = `${family}-${String(Math.floor(index / moduleNames.length) + 1).padStart(2, '0')}`
    const path = `${parent.path}/${label}`
    const module = createMutableNode(path, label, 'folder')
    parent.children.push(module)
    modules.push(module)
    branchIds.push(module.id)
  }

  const fileParents = modules.length > 0 ? modules : folders
  const fileCount = totalNodes - 1 - folders.length - modules.length

  for (let index = 0; index < fileCount; index += 1) {
    const parent = fileParents[
      index % fileParents.length
    ] as MutableRepositoryNode
    const topLevelFolder = parent.path.split('/')[0] as string
    const extensions = extensionsByFolder[topLevelFolder] ?? defaultExtensions
    const extension = extensions[index % extensions.length] as string
    const sequence = String(
      Math.floor(index / fileParents.length) + 1,
    ).padStart(3, '0')
    const label = `node-${sequence}.${extension}`
    const path = `${parent.path}/${label}`
    parent.children.push(createMutableNode(path, label, 'file'))
  }

  const frozenRoot = freezeNode(root)

  return Object.freeze({
    branchIds: Object.freeze(branchIds),
    items: Object.freeze([frozenRoot]),
    nodeCount: totalNodes,
  })
}

function createMutableNode(
  path: string,
  label: string,
  kind: RepositoryNodeKind,
): MutableRepositoryNode {
  return {
    children: [],
    id: path,
    kind,
    label,
    path,
  }
}

function freezeNode(node: MutableRepositoryNode): RepositoryNode {
  return Object.freeze({
    children: Object.freeze(node.children.map((child) => freezeNode(child))),
    id: node.id,
    kind: node.kind,
    label: node.label,
    path: node.path,
  })
}
