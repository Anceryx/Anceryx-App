const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function trapDialogTabKey(
  dialog: HTMLElement,
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
): boolean {
  if (event.key !== 'Tab') return false

  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true')
  const first = focusable[0]
  const last = focusable.at(-1)
  const active = dialog.ownerDocument.activeElement

  if (!first || !last) {
    event.preventDefault()
    dialog.focus()
    return true
  }

  if (active === dialog) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && (!dialog.contains(active) || active === first)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!dialog.contains(active) || active === last)) {
    event.preventDefault()
    first.focus()
  }
  return true
}

export function restoreDialogFocus(target: HTMLElement | null): void {
  if (target?.isConnected) target.focus()
}

/** Makes every DOM branch outside the dialog inert and restores prior values on cleanup. */
export function isolateDialogBackground(dialogRoot: HTMLElement, body: HTMLElement): () => void {
  const previous = new Map<HTMLElement, boolean>()
  const makeInert = (element: Element) => {
    const target = element as HTMLElement
    if (!('inert' in target) || previous.has(target)) return
    previous.set(target, target.inert)
    target.inert = true
  }

  let branch: Element = dialogRoot
  while (branch.parentElement && branch.parentElement !== body) {
    const parent: Element = branch.parentElement
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== branch) makeInert(sibling)
    }
    branch = parent
  }
  for (const sibling of Array.from(body.children)) {
    if (sibling !== branch) makeInert(sibling)
  }

  return () => {
    for (const [element, wasInert] of previous) element.inert = wasInert
  }
}
