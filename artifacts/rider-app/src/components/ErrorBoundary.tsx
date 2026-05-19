import { Component, type ReactNode } from "react";
import { reportError } from "../lib/error-reporter";
import { createLogger } from "@/lib/logger";
const log = createLogger("[ErrorBoundary]");

type FallbackFn = (reset: () => void, error: Error | null) => ReactNode;

interface Props { children: ReactNode; fallback?: ReactNode | FallbackFn; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    log.error("caught:", error, info);
    reportError({
      errorType: "frontend_crash",
      errorMessage: error.message || "Component crash",
      stackTrace: error.stack || info.componentStack,
      componentName: info.componentStack?.split("\n")[1]?.trim() || undefined,
    });
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return (fallback as FallbackFn)(this.reset, this.state.error);
      }
      if (fallback != null) return fallback;
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-white"
        >
          <div className="max-w-sm w-full">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.reset}
                className="w-full px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-5 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
