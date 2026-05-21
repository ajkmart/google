import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePermissions } from "@/hooks/usePermissions";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuthContext";
import { setupAdminFetcherHandlers } from "@/lib/adminFetcher";
import { adminTheme } from "@/lib/auth/theme";
import { ThemeProvider } from "@/lib/auth/ThemeContext";
import { auditAdminEnv } from "@/lib/envValidation";
import { initErrorReporter } from "@/lib/error-reporter";
import { createLogger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";
import { bootAccessibilitySettings } from "@/lib/useAccessibilitySettings";
import { useLanguage } from "@/lib/useLanguage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, useEffect, useRef, useState } from "react";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
const log = createLogger("[App]");

const _adminEnv = auditAdminEnv();
bootAccessibilitySettings();

import { AdminLayout } from "@/components/layout/AdminLayout";
import Broadcast from "@/pages/broadcast";
import Categories from "@/pages/categories";
import Dashboard from "@/pages/dashboard";
import ForgotPassword from "@/pages/forgot-password";
import Login from "@/pages/login";
import Orders from "@/pages/orders";
import Parcel from "@/pages/parcel";
import Pharmacy from "@/pages/pharmacy";
import Products from "@/pages/products";
import ResetPassword from "@/pages/reset-password";
import Rides from "@/pages/rides";
import Security from "@/pages/security";
import SetNewPassword from "@/pages/set-new-password";
import Settings from "@/pages/settings";
import Transactions from "@/pages/transactions";
import Users from "@/pages/users";
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const BusinessRulesPage = lazy(() => import("@/pages/business-rules"));
const LiveRidersMap = lazy(() => import("@/pages/live-riders-map"));
const VanService = lazy(() => import("@/pages/van"));
const DeliveryAccess = lazy(() => import("@/pages/delivery-access"));
const Popups = lazy(() => import("@/pages/popups"));
const PromotionsHub = lazy(() => import("@/pages/promotions-hub"));
const SupportChat = lazy(() => import("@/pages/support-chat"));
const FaqManagement = lazy(() => import("@/pages/faq-management"));
const ErrorMonitor = lazy(() => import("@/pages/error-monitor"));
const Communication = lazy(() => import("@/pages/communication"));
const Loyalty = lazy(() => import("@/pages/loyalty"));
const WalletTransfers = lazy(() => import("@/pages/wallet-transfers"));
const ChatMonitor = lazy(() => import("@/pages/chat-monitor"));
const QrCodes = lazy(() => import("@/pages/qr-codes"));
const Experiments = lazy(() => import("@/pages/experiments"));
const WebhookManager = lazy(() => import("@/pages/webhook-manager"));
const DeepLinks = lazy(() => import("@/pages/deep-links"));
const LaunchControl = lazy(() => import("@/pages/launch-control"));
const OtpControl = lazy(() => import("@/pages/otp-control"));
const AuthMethods = lazy(() => import("@/pages/auth-methods"));
const AuthControl = lazy(() => import("@/pages/auth-control"));
const AuditLogs = lazy(() => import("@/pages/audit-logs"));
const WhatsAppDeliveryLog = lazy(() => import("@/pages/whatsapp-delivery-log"));
const HealthDashboard = lazy(() => import("@/pages/health-dashboard"));

const QUERY_RETRY_COUNT = 1;
const QUERY_RETRY_DELAY_MS = 1_000;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY_COUNT,
      retryDelay: QUERY_RETRY_DELAY_MS,
      refetchOnWindowFocus: false,
    },
  },
});

interface QueryAuthError {
  message?: string;
  status?: number;
}
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const raw = event.action.error;
    const err: QueryAuthError = raw && typeof raw === "object" ? (raw as QueryAuthError) : {};
    const msg = (err.message || "").toLowerCase();
    const is401 =
      msg.includes("unauthorized") ||
      msg.includes("session expired") ||
      msg.includes("please log in") ||
      err.status === 401;
    if (is401) log.warn("Received 401 from query - auth will be handled by fetcher");
  }
});

const LOADER_TIMEOUT_MS = 10_000;
function RedirectTo({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  return null;
}
function GlobalAuthRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    function handleForceRedirect() {
      navigate("/login", { replace: true });
    }
    window.addEventListener("admin:force-redirect-to-login", handleForceRedirect);
    return () => window.removeEventListener("admin:force-redirect-to-login", handleForceRedirect);
  }, [navigate]);
  return null;
}
function SuspenseLoadingFallback() {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), LOADER_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);
  if (timedOut)
    return (
      <ErrorRetry
        variant="page"
        title="Loading timed out"
        description="The page chunk took too long to load. Check your connection and try again."
      />
    );
  return (
    <div className="flex items-center justify-center p-12">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}
function useLoaderTimeout(loading: boolean, ms = LOADER_TIMEOUT_MS): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => setTimedOut(true), ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, ms]);
  return timedOut;
}
function ProtectedRoute({
  component: Component,
  requirePermission,
  fullScreen = false,
}: {
  component: React.ComponentType;
  requirePermission?: string | string[];
  fullScreen?: boolean;
}) {
  const { has } = usePermissions();
  const allowed =
    !requirePermission ||
    (typeof requirePermission === "string"
      ? has(requirePermission)
      : requirePermission.some((p) => has(p)));
  if (!allowed) return <RedirectTo to="/403" />;
  return fullScreen ? (
    <Component />
  ) : (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function AppRoutes() {
  const { state } = useAdminAuth();
  return (
    <Switch>
      <Route path="/">
        <RedirectTo to={state.accessToken ? "/dashboard" : "/login"} />
      </Route>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/forgot-password">
        <ForgotPassword />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route path="/set-new-password">
        <SetNewPassword />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} requirePermission="dashboard.view" />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={Users} requirePermission="users.view" />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={Orders} requirePermission="orders.view" />
      </Route>
      <Route path="/rides">
        <ProtectedRoute component={Rides} requirePermission="fleet.rides.view" />
      </Route>
      <Route path="/pharmacy">
        <ProtectedRoute component={Pharmacy} requirePermission="fleet.pharmacy.view" />
      </Route>
      <Route path="/parcel">
        <ProtectedRoute component={Parcel} requirePermission="fleet.parcel.view" />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={Products} requirePermission="content.products.view" />
      </Route>
      <Route path="/broadcast">
        <ProtectedRoute component={Broadcast} requirePermission="support.broadcast.send" />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={Transactions} requirePermission="finance.transactions.view" />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} requirePermission="system.settings.view" />
      </Route>
      <Route path="/security">
        <ProtectedRoute component={Security} requirePermission="system.settings.view" />
      </Route>
      <Route path="/auth-methods">
        <ProtectedRoute component={AuthMethods} requirePermission="system.settings.edit" />
      </Route>
      <Route path="/auth-control">
        <ProtectedRoute component={AuthControl} requirePermission="system.settings.edit" />
      </Route>
      <Route path="/categories">
        <ProtectedRoute component={Categories} requirePermission="content.products.view" />
      </Route>
    </Switch>
  );
}

function VersionCheckInit() {
  useVersionCheck();
  return null;
}
function LanguageInit() {
  useLanguage();
  return null;
}
function IntegrationsInit() {
  const { state, refreshAccessToken } = useAdminAuth();
  useEffect(() => {
    setupAdminFetcherHandlers(
      () => state.accessToken,
      () => refreshAccessToken()
    );
  }, [state.accessToken, refreshAccessToken]);
  useEffect(() => {
    initErrorReporter();
    fetch(`/api/platform-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (!raw) return;
        const d = raw?.data ?? raw;
        const integ = d?.integrations;
        if (!integ) return;
        if (integ.sentry && integ.sentryDsn)
          initSentry({
            dsn: integ.sentryDsn,
            environment: integ.sentryEnvironment || "production",
            sampleRate: integ.sentrySampleRate ?? 0.2,
            tracesSampleRate: integ.sentryTracesSampleRate ?? 0.1,
          });
      });
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider theme={adminTheme}>
            <AdminAuthProvider>
              <WouterRouter base="/admin">
                <GlobalAuthRedirect />
                <VersionCheckInit />
                <LanguageInit />
                <IntegrationsInit />
                <AppRoutes />
                <Toaster />
              </WouterRouter>
            </AdminAuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
