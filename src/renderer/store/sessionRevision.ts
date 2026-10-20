export function createSessionRevision() {
  let revision = 0

  return {
    current: () => revision,
    advance: () => ++revision,
    isCurrent: (candidate: number) => candidate === revision,
  }
}
