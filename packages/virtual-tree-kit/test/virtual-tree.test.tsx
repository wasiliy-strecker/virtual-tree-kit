import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  VirtualTree,
  type TreeId,
  type UseVirtualTreeOptions,
  type VirtualTreeProps,
  useVirtualTree,
} from '../src/index.js'
import { roots, type TestNode } from './fixtures.js'

const hookProps = {
  ariaLabel: 'Repository files',
  getChildren: (node: TestNode) => node.children,
  getId: (node: TestNode) => node.id,
  getTextValue: (node: TestNode) => node.label,
  items: roots,
  rowHeight: 32,
  viewportHeight: 96,
} satisfies UseVirtualTreeOptions<TestNode>

const baseProps = {
  ...hookProps,
  renderItem: ({ item }: { item: TestNode }) => <span>{item.label}</span>,
} satisfies VirtualTreeProps<TestNode>

describe('VirtualTree', () => {
  it('renders only the viewport and overscan for a large collection', () => {
    const items = Array.from({ length: 10_000 }, (_, index) => ({
      children: [],
      id: `item-${index}`,
      label: `Item ${index}`,
    }))

    render(<VirtualTree {...baseProps} items={items} overscan={2} />)

    expect(screen.getByRole('tree')).toHaveStyle({ height: '96px' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(5)
    expect(screen.getByRole('presentation')).toHaveStyle({
      height: '320000px',
    })
    expect(screen.queryByText('Item 9999')).not.toBeInTheDocument()
  })

  it('exposes hierarchy, expansion, selection, and active-descendant semantics', () => {
    render(
      <VirtualTree
        {...baseProps}
        defaultExpandedIds={['alpha']}
        defaultSelectedId="alpha-one"
      />,
    )

    const tree = screen.getByRole('tree')
    const alpha = screen.getByRole('treeitem', { name: /Alpha$/ })
    const alphaOne = screen.getByRole('treeitem', { name: /Álpha one/ })

    expect(tree).toHaveAttribute('aria-activedescendant', alphaOne.id)
    expect(alpha).toHaveAttribute('aria-expanded', 'true')
    expect(alpha).toHaveAttribute('aria-level', '1')
    expect(alpha).toHaveAttribute('aria-posinset', '1')
    expect(alpha).toHaveAttribute('aria-setsize', '3')
    expect(alphaOne).toHaveAttribute('aria-level', '2')
    expect(alphaOne).toHaveAttribute('aria-selected', 'true')
    expect(alphaOne).toHaveAttribute('data-active')
  })

  it('implements arrow, Home, End, Enter, and Space behavior', async () => {
    const onSelectionChange = vi.fn()
    const user = userEvent.setup()
    render(
      <VirtualTree
        {...baseProps}
        onSelectionChange={onSelectionChange}
        overscan={0}
      />,
    )
    const tree = screen.getByRole('tree')
    tree.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('treeitem', { name: /Alpha$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(activeItem(tree)).toHaveTextContent('Alpha two')

    await user.keyboard('{ArrowUp}')
    expect(activeItem(tree)).toHaveTextContent('Álpha one')

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowLeft}')
    expect(activeItem(tree)).toHaveTextContent('Alpha')

    await user.keyboard('{End}')
    expect(activeItem(tree)).toHaveTextContent('Gamma')
    expect(tree.scrollTop).toBeGreaterThan(0)

    await user.keyboard('{Enter}{Home} ')
    expect(onSelectionChange).toHaveBeenNthCalledWith(
      1,
      'gamma',
      expect.objectContaining({ id: 'gamma' }),
    )
    expect(onSelectionChange).toHaveBeenNthCalledWith(
      2,
      'alpha',
      expect.objectContaining({ id: 'alpha' }),
    )
  })

  it('supports wrapping, accent-insensitive typeahead and repeated keys', () => {
    vi.useFakeTimers()
    render(<VirtualTree {...baseProps} defaultExpandedIds={['alpha']} />)
    const tree = screen.getByRole('tree')
    tree.focus()

    fireEvent.keyDown(tree, { key: 'b' })
    expect(activeItem(tree)).toHaveTextContent('Beta')

    act(() => {
      vi.advanceTimersByTime(500)
    })
    fireEvent.keyDown(tree, { key: 'a' })
    expect(activeItem(tree)).toHaveTextContent('Alpha')

    fireEvent.keyDown(tree, { key: 'a' })
    expect(activeItem(tree)).toHaveTextContent('Álpha one')
    vi.useRealTimers()
  })

  it('resets the typeahead buffer and ignores modified or composing keys', () => {
    vi.useFakeTimers()
    render(
      <VirtualTree
        {...baseProps}
        defaultExpandedIds={['alpha']}
        typeaheadResetMs={250}
      />,
    )
    const tree = screen.getByRole('tree')
    tree.focus()

    fireEvent.keyDown(tree, { ctrlKey: true, key: 'b' })
    fireEvent.keyDown(tree, { isComposing: true, key: 'b' })
    expect(activeItem(tree)).toHaveTextContent('Alpha')

    fireEvent.keyDown(tree, { key: 'a' })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    fireEvent.keyDown(tree, { key: 'g' })
    expect(activeItem(tree)).toHaveTextContent('Gamma')

    fireEvent.keyDown(tree, { key: 'a' })
    expect(activeItem(tree)).toHaveTextContent('Gamma')
    vi.useRealTimers()
  })

  it('supports pointer selection and disclosure without moving DOM focus', async () => {
    const user = userEvent.setup()
    render(<VirtualTree {...baseProps} />)
    const tree = screen.getByRole('tree')
    const disclosure = screen
      .getByRole('treeitem', { name: /Alpha$/ })
      .querySelector('[data-virtual-tree-disclosure]')

    expect(disclosure).not.toBeNull()
    await user.click(disclosure as Element)
    expect(screen.getByText('Álpha one')).toBeVisible()

    await user.click(screen.getByRole('treeitem', { name: /Beta/ }))
    expect(tree).toHaveFocus()
    expect(screen.getByRole('treeitem', { name: /Beta/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('honors controlled expansion and selection', async () => {
    const user = userEvent.setup()
    render(<ControlledTree />)

    await user.click(
      screen
        .getByRole('treeitem', { name: /Alpha$/ })
        .querySelector('[data-virtual-tree-disclosure]') as Element,
    )
    expect(screen.getByText('Álpha one')).toBeVisible()

    await user.click(screen.getByRole('treeitem', { name: /Álpha one/ }))
    expect(screen.getByTestId('selected-value')).toHaveTextContent('alpha-one')
  })

  it('moves focus to the nearest visible ancestor when a branch collapses', async () => {
    const user = userEvent.setup()
    render(
      <VirtualTree
        {...baseProps}
        defaultExpandedIds={['alpha', 'alpha-two']}
        defaultSelectedId="alpha-two-a"
      />,
    )
    const tree = screen.getByRole('tree')
    tree.focus()

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(activeItem(tree)).toHaveTextContent('Alpha two')
    expect(screen.queryByText('Alpha two A')).not.toBeInTheDocument()
  })

  it('resolves an initially hidden selection to its nearest visible ancestor', () => {
    render(<VirtualTree {...baseProps} defaultSelectedId="alpha-two-a" />)

    const tree = screen.getByRole('tree')
    expect(activeItem(tree)).toHaveTextContent('Alpha')
    expect(screen.getByRole('treeitem', { name: /Alpha$/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('falls back to the first item for a stale controlled selection', () => {
    render(<VirtualTree {...baseProps} selectedId="removed-node" />)

    expect(activeItem(screen.getByRole('tree'))).toHaveTextContent('Alpha')
  })

  it('mounts and announces a controlled active item outside the initial range', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      children: [],
      id: `item-${index}`,
      label: `Item ${index}`,
    }))

    render(
      <VirtualTree
        {...baseProps}
        items={items}
        overscan={0}
        selectedId="item-99"
      />,
    )

    const tree = screen.getByRole('tree')
    expect(activeItem(tree)).toHaveTextContent('Item 99')
    expect(tree.scrollTop).toBeGreaterThan(0)
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)
  })

  it('keeps imperative methods safe for unknown and leaf ids', () => {
    const onExpandedChange = vi.fn()
    const onSelectionChange = vi.fn()
    const { result } = renderHook(() =>
      useVirtualTree({
        ...hookProps,
        onExpandedChange,
        onSelectionChange,
      }),
    )

    act(() => {
      result.current.toggle('missing')
      result.current.toggle('beta')
      result.current.select('missing')
      result.current.scrollTo('missing')
      result.current.scrollTo('gamma')
    })

    expect(onExpandedChange).not.toHaveBeenCalled()
    expect(onSelectionChange).not.toHaveBeenCalled()
    expect(result.current.activeId).toBe('alpha')
  })

  it('leaves empty trees focusable and ignores empty actions', () => {
    render(<VirtualTree {...baseProps} items={[]} />)

    const tree = screen.getByRole('tree')
    expect(tree).not.toHaveAttribute('aria-activedescendant')
    fireEvent.keyDown(tree, { key: 'ArrowDown' })
    fireEvent.keyDown(tree, { key: 'Enter' })
    expect(screen.queryAllByRole('treeitem')).toEqual([])
  })
})

function ControlledTree() {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<TreeId>>(new Set())
  const [selectedId, setSelectedId] = useState<TreeId | null>(null)

  return (
    <>
      <VirtualTree
        {...baseProps}
        expandedIds={expandedIds}
        onExpandedChange={setExpandedIds}
        onSelectionChange={setSelectedId}
        selectedId={selectedId}
      />
      <output data-testid="selected-value">{selectedId}</output>
    </>
  )
}

function activeItem(tree: HTMLElement): HTMLElement {
  const id = tree.getAttribute('aria-activedescendant')
  const item = id ? document.getElementById(id) : null
  expect(item).not.toBeNull()
  return item as HTMLElement
}
