"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatusValue = "saved" | "unsaved" | "saving" | "error";

type UseAutosaveOptions<T> = {
  /** Persists one snapshot. Must throw on failure so the content is kept for a retry. */
  save: (content: T) => Promise<void>;
  /** Viewers pass false so they never send a request. */
  enabled: boolean;
  delayMs?: number;
};

/**
 * Debounced autosave with at most one request in flight.
 *
 * Content lives in a ref (not state) so typing never re-renders the editor screen, and so the
 * latest snapshot is always what gets sent, even if several edits pile up during a slow save.
 */
export function useAutosave<T>({ save, enabled, delayMs = 1000 }: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatusValue>("saved");

  // Latest content that the server does not have yet. null means nothing is waiting.
  const pendingRef = useRef<T | null>(null);
  const inFlightRef = useRef(false);
  // Every request gets a number; only the newest one may update the status.
  const sequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kept in a ref so markDirty and flush stay stable while the caller's save function changes.
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(async () => {
    // A save already running will pick up pending content when it finishes.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Loop rather than recurse: edits that arrive during a save are sent right after it,
    // always with the latest snapshot.
    while (pendingRef.current !== null) {
      const content = pendingRef.current;
      pendingRef.current = null;
      const sequence = ++sequenceRef.current;
      setStatus("saving");
      try {
        await saveRef.current(content);
        if (sequence === sequenceRef.current && pendingRef.current === null) setStatus("saved");
      } catch {
        // Put the snapshot back unless the user typed something newer meanwhile, which already
        // contains these edits. Either way nothing is dropped.
        if (pendingRef.current === null) pendingRef.current = content;
        if (sequence === sequenceRef.current) setStatus("error");
        // Stop here instead of hammering a failing server; the next edit or Retry tries again.
        break;
      }
    }
    inFlightRef.current = false;
  }, []);

  const markDirty = useCallback(
    (content: T) => {
      if (!enabled) return;
      pendingRef.current = content;
      setStatus((current) => (current === "saving" ? current : "unsaved"));
      clearTimer();
      timerRef.current = setTimeout(() => void flush(), delayMs);
    },
    [enabled, delayMs, clearTimer, flush],
  );

  const retry = useCallback(() => {
    clearTimer();
    void flush();
  }, [clearTimer, flush]);

  // Leaving the page through an in-app link unmounts the editor; send what is waiting instead of
  // losing the last second of typing.
  useEffect(() => {
    return () => {
      clearTimer();
      void flush();
    };
  }, [clearTimer, flush]);

  return { status, markDirty, retry, hasUnsavedChanges: status !== "saved" };
}
