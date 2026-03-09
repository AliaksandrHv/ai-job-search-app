type AIButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export function AIButton({
  label,
  onClick,
  disabled = false,
  isLoading = false,
}: AIButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "Working..." : label}
    </button>
  );
}
