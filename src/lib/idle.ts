export interface IdleTaskHandle {
  cancel: () => void;
}

export function scheduleIdleTask(
  callback: () => void,
  timeout = 800
): IdleTaskHandle {
  if (typeof globalThis === "undefined") {
    return { cancel: () => undefined };
  }

  if (
    typeof globalThis.requestIdleCallback === "function" &&
    typeof globalThis.cancelIdleCallback === "function"
  ) {
    const id = globalThis.requestIdleCallback(callback, { timeout });
    return {
      cancel: () => globalThis.cancelIdleCallback(id),
    };
  }

  const id = globalThis.setTimeout(callback, 1);
  return {
    cancel: () => globalThis.clearTimeout(id),
  };
}
