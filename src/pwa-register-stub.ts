// Used only for the single-file preview build, which has no service worker.
export function registerSW(_opts?: unknown) {
  void _opts
  return async (_reload?: boolean) => { void _reload }
}
