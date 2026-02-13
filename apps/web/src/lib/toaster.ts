import { OverlayToaster, type Toaster } from '@blueprintjs/core';

let toasterPromise: Promise<Toaster> | null = null;

/**
 * Returns a lazily-initialized OverlayToaster instance.
 *
 * Unlike calling `OverlayToaster.createAsync()` at module scope,
 * this defers DOM access until the first invocation — which is always
 * inside an event handler in the browser — avoiding the
 * "domRenderer is not a function" error during SSR / module evaluation.
 */
export function getToaster(): Promise<Toaster> {
  if (!toasterPromise) {
    toasterPromise = OverlayToaster.createAsync({ position: 'top' });
  }
  return toasterPromise;
}
