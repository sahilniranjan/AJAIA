import type { SaveStatusValue } from "@/hooks/useAutosave";

const LABELS: Record<Exclude<SaveStatusValue, "error">, string> = {
  saved: "Saved",
  saving: "Saving...",
  unsaved: "Unsaved changes",
};

export function SaveStatus({ status, onRetry }: { status: SaveStatusValue; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="text-sm">
      {status === "error" ? (
        <span className="text-red-700">
          Couldn&apos;t save -{" "}
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline hover:text-red-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Retry
          </button>
        </span>
      ) : (
        <span className="text-slate-500">{LABELS[status]}</span>
      )}
    </div>
  );
}
