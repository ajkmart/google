import { Component, type ReactNode } from "react";
import { reportError } from "@/lib/error-reporter";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { createLogger } from "@/lib/logger";
const log = createLogger("[ErrorBoundary]");

type FallbackFn = (reset: () => void, error: Error | null) => ReactNode;

interface Props {
  children: ReactNode;
  fallback?: ReactNode | FallbackFn;
}
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
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

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return (fallback as FallbackFn)(this.handleRetry, this.state.error);
      }
      if (fallback != null) return fallback;
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50"
        >
          <ErrorRetry
            title="Something went wrong"
            description={this.state.error?.message || "An unexpected error occurred."}
            onRetry={this.handleRetry}
            variant="page"
          />
        </div>
      );
    }
    return this.props.children;
  }
}
