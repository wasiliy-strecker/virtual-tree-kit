export interface VirtualRangeOptions {
  readonly itemCount: number
  readonly overscan: number
  readonly rowHeight: number
  readonly scrollOffset: number
  readonly viewportHeight: number
}

export interface VirtualItem {
  readonly end: number
  readonly index: number
  readonly size: number
  readonly start: number
}

export interface VirtualRange {
  readonly endIndex: number
  readonly items: readonly VirtualItem[]
  readonly startIndex: number
  readonly totalSize: number
}

export type ScrollAlignment = 'center' | 'end' | 'nearest' | 'start'

export interface ScrollToIndexOptions {
  readonly alignment?: ScrollAlignment
  readonly currentOffset: number
  readonly index: number
  readonly itemCount: number
  readonly rowHeight: number
  readonly viewportHeight: number
}

export function calculateVirtualRange(
  options: VirtualRangeOptions,
): VirtualRange {
  validateOptions(options)
  const { itemCount, overscan, rowHeight, viewportHeight } = options
  const totalSize = itemCount * rowHeight

  if (itemCount === 0 || viewportHeight === 0) {
    return Object.freeze({
      endIndex: -1,
      items: Object.freeze([]),
      startIndex: 0,
      totalSize,
    })
  }

  const maxOffset = Math.max(0, totalSize - viewportHeight)
  const scrollOffset = clamp(options.scrollOffset, 0, maxOffset)
  const firstVisible = Math.min(
    itemCount - 1,
    Math.floor(scrollOffset / rowHeight),
  )
  const lastVisible = Math.min(
    itemCount - 1,
    Math.max(
      firstVisible,
      Math.ceil((scrollOffset + viewportHeight) / rowHeight) - 1,
    ),
  )
  const startIndex = Math.max(0, firstVisible - overscan)
  const endIndex = Math.min(itemCount - 1, lastVisible + overscan)
  const items: VirtualItem[] = []

  for (let index = startIndex; index <= endIndex; index += 1) {
    const start = index * rowHeight
    items.push(
      Object.freeze({
        end: start + rowHeight,
        index,
        size: rowHeight,
        start,
      }),
    )
  }

  return Object.freeze({
    endIndex,
    items: Object.freeze(items),
    startIndex,
    totalSize,
  })
}

export function getScrollOffsetForIndex(options: ScrollToIndexOptions): number {
  const { currentOffset, index, itemCount, rowHeight, viewportHeight } = options
  validateInteger('itemCount', itemCount, 0)
  validatePositive('rowHeight', rowHeight)
  validateFinite('viewportHeight', viewportHeight, 0)
  validateFinite('currentOffset', currentOffset, 0)

  if (!Number.isInteger(index) || index < 0 || index >= itemCount) {
    throw new RangeError('index must identify an existing item.')
  }

  const alignment = options.alignment ?? 'nearest'
  const itemStart = index * rowHeight
  const itemEnd = itemStart + rowHeight
  const totalSize = itemCount * rowHeight
  const maxOffset = Math.max(0, totalSize - viewportHeight)
  const clampedCurrent = clamp(currentOffset, 0, maxOffset)
  let nextOffset: number

  switch (alignment) {
    case 'start':
      nextOffset = itemStart
      break
    case 'center':
      nextOffset = itemStart - (viewportHeight - rowHeight) / 2
      break
    case 'end':
      nextOffset = itemEnd - viewportHeight
      break
    case 'nearest':
      if (itemStart < clampedCurrent) {
        nextOffset = itemStart
      } else if (itemEnd > clampedCurrent + viewportHeight) {
        nextOffset = itemEnd - viewportHeight
      } else {
        nextOffset = clampedCurrent
      }
      break
  }

  return clamp(nextOffset, 0, maxOffset)
}

function validateOptions(options: VirtualRangeOptions): void {
  validateInteger('itemCount', options.itemCount, 0)
  validateInteger('overscan', options.overscan, 0)
  validatePositive('rowHeight', options.rowHeight)
  validateFinite('scrollOffset', options.scrollOffset, 0)
  validateFinite('viewportHeight', options.viewportHeight, 0)
}

function validateInteger(name: string, value: number, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer of at least ${minimum}.`)
  }
}

function validatePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`)
  }
}

function validateFinite(name: string, value: number, minimum: number): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(
      `${name} must be a finite number of at least ${minimum}.`,
    )
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
