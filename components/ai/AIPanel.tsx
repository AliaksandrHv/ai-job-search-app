type AIPanelProps = {
  title: string;
  description: string;
  result: string;
  error: string;
  isLoading: boolean;
  onRetry: () => void;
  onClose: () => void;
};

export function AIPanel({
  title,
  description,
  result,
  error,
  isLoading,
  onRetry,
  onClose,
}: AIPanelProps) {
  return (
    <aside className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            AI Copilot
          </p>
          <h4 className="mt-1 text-lg font-semibold">{title}</h4>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
        >
          Close
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
        {isLoading ? (
          <div aria-live="polite" className="space-y-2 text-sm text-[var(--text-muted)]">
            <div className="h-3 w-24 animate-pulse rounded bg-white/70" />
            <div className="h-3 w-full animate-pulse rounded bg-white/70" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/70" />
          </div>
        ) : error ? (
          <div>
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-white/80"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {result}
          </div>
        )}
      </div>
    </aside>
  );
}
