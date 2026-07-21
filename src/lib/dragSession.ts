/** Shared drag session so columns don't write Pinia until the drop finishes.
 *  Also dampens border ping-pong between adjacent columns.
 */

const pendingByColumn = new Map<string, string[]>()

/** Pixels inside a column before we allow a cross-column transfer. */
const EDGE_INSET_PX = 18

let active = false
let rejectArmed = false
/** Column that currently "owns" the dragged card (sticky until clearly inside another). */
let stickyColumnId: string | null = null

export function isDragSessionActive(): boolean {
  return active
}

export function beginDragSession(fromColumnId: string): void {
  active = true
  rejectArmed = false
  stickyColumnId = fromColumnId
  pendingByColumn.clear()
}

export function noteColumnIds(columnId: string, ids: string[]): void {
  pendingByColumn.set(columnId, [...ids])
}

export function endDragSession(
  commit: (columnId: string, ids: string[]) => void,
): void {
  if (!active) return
  active = false
  stickyColumnId = null
  for (const [columnId, ids] of pendingByColumn) {
    commit(columnId, ids)
  }
  pendingByColumn.clear()
  rejectArmed = false
}

/** Returns whether put is allowed; `blocked` means WIP rejected this attempt. */
export function armRejectOnce(blocked: boolean): boolean {
  if (!blocked) {
    rejectArmed = false
    return false
  }
  if (rejectArmed) return false
  rejectArmed = true
  return true
}

function clientXFromEvent(event: Event): number | null {
  if (event instanceof MouseEvent) return event.clientX
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    const t = event.touches[0] ?? event.changedTouches[0]
    return t?.clientX ?? null
  }
  // PointerEvent extends MouseEvent in modern browsers; keep a soft fallback
  const anyEvt = event as { clientX?: number }
  return typeof anyEvt.clientX === 'number' ? anyEvt.clientX : null
}

/**
 * Prevent Doing↔Done (etc.) thrash when the pointer sits on the shared border.
 * Same-list moves always allowed. Cross-list needs the pointer clearly inside the target.
 */
export function allowCrossColumnMove(
  fromColumnId: string,
  toColumnId: string,
  toListEl: HTMLElement,
  originalEvent: Event,
): boolean {
  if (fromColumnId === toColumnId) return true

  const x = clientXFromEvent(originalEvent)
  if (x == null) return true

  const rect = toListEl.getBoundingClientRect()
  const left = rect.left + EDGE_INSET_PX
  const right = rect.right - EDGE_INSET_PX

  // Dead zone on the column edges — stop back-and-forth at the border
  if (x < left || x > right) {
    return false
  }

  // Sticky ownership: once parked in a column, require a clearer re-entry to leave
  if (stickyColumnId && stickyColumnId !== toColumnId) {
    const stickyInset = EDGE_INSET_PX * 1.35
    if (x < rect.left + stickyInset || x > rect.right - stickyInset) {
      return false
    }
  }

  stickyColumnId = toColumnId
  return true
}
