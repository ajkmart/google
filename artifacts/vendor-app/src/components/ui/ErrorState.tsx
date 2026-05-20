import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  subtitle = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)" }}>
        <AlertCircle size={28} style={{ color: "#F87171" }} />
      </div>
      <p className="font-bold text-white text-base">{title}</p>
      {subtitle && (
        <p className="text-sm mt-1 leading-relaxed max-w-xs" style={{ color: "#6B7280" }}>{subtitle}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl transition-colors"
          style={{ background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.22)" }}
        >
          <RefreshCw size={13} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
