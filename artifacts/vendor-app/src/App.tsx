import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/vendor-auth";
import { ThemeProvider } from "./lib/auth/ThemeContext";
import { vendorTheme } from "./lib/auth/theme";
import { usePlatformConfig } from "./lib/useConfig";
import { useLanguage } from "./lib/useLanguage";
import { registerPush, consumePendingNotificationTap, type PushErrorHandler } from "./lib/push";
import { markOrderSeen, wasOrderSeenRecently } from "./lib/notificationSound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";

import { Capacitor } from "@capacitor/core";
import { initSentry, setSentryUser } from "./lib/sentry";
import { initAnalytics, trackEvent, identifyUser } from "./lib/analytics";
import { initErrorReporter } from "./lib/error-reporter";
import { setApiTimeoutMs, api } from "./lib/api";

import { vendorEnv } from "./lib/envValidation";
import { BottomNav } from "./components/BottomNav";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { SideNav } from "./components/SideNav";
import { BOTTOM_PADDING } from "./lib/ui";
import { AnnouncementBar } from "./components/AnnouncementBar";
import { PopupEngine } from "./components/PopupEngine";
import { MaintenanceScreen } from "./components/MaintenanceScreen";

/* ── Auth screens: eagerly loaded (needed before user is known) ── */
import GuestLanding from "./pages/GuestLanding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

/* ── Dashboard: eagerly loaded (first screen after login) ── */
import Dashboard from "./pages/Dashboard";

/* ── Secondary pages: lazy loaded (only fetched when navigated to) ── */
const Orders       = lazy(() => import("./pages/Orders"));
const Products     = lazy(() => import("./pages/Products"));
const Store        = lazy(() => import("./pages/Store"));
const Profile      = lazy(() => import("./pages/Profile"));
const Wallet       = lazy(() => import("./pages/Wallet"));
const Analytics    = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Reviews      = lazy(() => import("./pages/Reviews"));
const Promos       = lazy(() => import("./pages/Promos"));
const Campaigns    = lazy(() => import("./pages/Campaigns"));
const Chat         = lazy(() => import("./pages/Chat"));

/* ── Shared skeleton shown while a lazy page loads ── */
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-2/5" />
      <div className="h-32 bg-gray-100 rounded-2xl w-full" />
      <div className="h-24 bg-gray-100 rounded-2xl w-full" />
      <div className="h-24 bg-gray-100 rounded-2xl w-full" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: true } },
});

const MAINTENANCE_GRACE_MS = 5 * 60 * 1000; /* 5-minute grace period */

function PendingApprovalScreen({ supportPhone, onRefresh, onSignOut }: {
  supportPhone?: string;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await onRefresh();
      setCheckedOnce(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#161B22", border: "1px solid #252D3A", borderRadius: 22, padding: "32px 24px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 68, height: 68, borderRadius: 18, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Application Pending</h2>
        <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>Your vendor account is pending admin approval. You will be notified once your account is approved.</p>
        {checkedOnce && (
          <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 16px" }}>Still pending — please check back later.</p>
        )}
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          style={{ display: "block", width: "100%", padding: "12px 0", marginBottom: 10, borderRadius: 12, background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: checking ? "not-allowed" : "pointer", opacity: checking ? 0.7 : 1, border: "none" }}
        >
          {checking ? "Checking…" : "Check Approval Status"}
        </button>
        {supportPhone && (
          <a href={`tel:${supportPhone}`} style={{ display: "block", width: "100%", padding: "11px 0", marginBottom: 10, borderRadius: 12, background: "transparent", border: "1px solid #374151", color: "#9CA3AF", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Contact Support
          </a>
        )}
        <button onClick={onSignOut}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid #252D3A", background: "#0F1117", color: "#6B7280", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function KycGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  if (user?.kycStatus === "verified") return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl shadow-sm max-w-sm w-full p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🔒</div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-2">Identity Verification Required</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          Complete KYC verification to unlock this feature and other premium capabilities.
        </p>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-left space-y-1.5">
          {["📊 Business Analytics", "🏷️ Discount Promotions", "📢 Ad Campaigns", "💸 Wallet Withdrawals"].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        {user?.kycStatus === "pending" ? (
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-blue-700">⏳ Verification Under Review</p>
            <p className="text-xs text-blue-500 mt-1">Our team will notify you within 24 hours once your documents are approved.</p>
          </div>
        ) : (
          <button
            onClick={() => navigate("/profile")}
            className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm"
          >
            Verify My Identity →
          </button>
        )}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, logout, storageError, sessionExpired, clearSessionExpired, refreshUser } = useAuth();
  const { config } = usePlatformConfig();
  useLanguage(); /* initialises RTL + language from API on mount */

  useEffect(() => { initErrorReporter(); }, []);

  useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, []);

  const prevUserRef = React.useRef(user);
  useEffect(() => {
    if (prevUserRef.current !== null && user === null) {
      queryClient.clear();
    }
    prevUserRef.current = user;
  }, [user]);

  /* ── Apply network/retry settings from platform config on startup ── */
  useEffect(() => {
    const net = config?.network;
    if (!net) return;
    if (typeof net.apiTimeoutMs === "number") setApiTimeoutMs(net.apiTimeoutMs);
  }, [config]);

  /* ── Sentry + Analytics init from platform config ── */
  useEffect(() => {
    const integ = config?.integrations;
    if (!integ) return;
    if (integ.sentry && integ.sentryDsn) {
      initSentry(integ.sentryDsn, integ.sentryEnvironment, integ.sentrySampleRate, integ.sentryTracesSampleRate);
    }
    if (integ.analytics && integ.analyticsTrackingId) {
      initAnalytics(integ.analyticsPlatform, integ.analyticsTrackingId, integ.analyticsDebug ?? false);
    }
  }, [config?.integrations]);

  const [location, navigate] = useLocation();

  /* ── Cold-start notification tap: consume any tap captured before auth loaded ──
     When the vendor taps a new-order push notification from a killed app, the
     pushNotificationActionPerformed listener fires at module-load time and
     stashes the data.  We drain it here once the session is ready. */
  useEffect(() => {
    if (!user) return;
    const pending = consumePendingNotificationTap();
    if (pending?.orderId) {
      /* Fire-and-forget prefetch: seed the per-order cache so Orders.tsx
         renders the tapped order detail instantly from cache.
         Navigation is immediate — never blocked by network or prefetch outcome. */
      const orderId = pending.orderId;
      queryClient.prefetchQuery({
        queryKey: ["vendor-order", orderId],
        queryFn: () => api.getVendorOrder(orderId),
        staleTime: 30_000,
      }).catch((err) => { console.warn('[artifacts/vendor-app/src/App.tsx]', err); }); // eslint-disable-line no-console
      navigate(`/orders/${orderId}`);

    } else if (pending) {
      navigate("/orders");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, navigate]);

  /* ── Push registration error state: shown as a dismissable banner ── */
  const [pushError, setPushError] = useState<"permission_denied" | "registration_failed" | "network_error" | null>(null);


  /* ── FCM foreground notification banner ── */
  const [fcmNotif, setFcmNotif] = useState<{ title: string; body: string; orderId?: string } | null>(null);
  const fcmCleanupRef = useRef<{ remove: () => void } | null>(null);
  const fcmDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    const onForeground = (title: string, body: string, data?: Record<string, string>) => {
      /* Play a short notification sound for new-order events.
         Deduplicate against the Socket.IO handler: if both FCM and Socket.IO
         deliver the same order within 5 seconds, only the first arrival plays
         sound / shows a banner. */
      const notifType = data?.type ?? "";
      if (notifType === "new_order" || notifType === "order_status") {
        const orderId = data?.orderId;
        if (orderId) {
          if (wasOrderSeenRecently(orderId)) {
            /* Already handled by the Socket.IO path — skip duplicate alert */
            return;
          }
          markOrderSeen(orderId);
        }

        try {
          const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextCtor) return;
          const ctx = new AudioContextCtor();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch (err) { console.warn('[artifacts/vendor-app/src/App.tsx]', err); } // eslint-disable-line no-console
      }
      /* Banner copy for cancellation and settlement types */
      let displayTitle = title;
      let displayBody = body;
      if (notifType === "order_cancelled") {
        displayTitle = "❌ Order Cancelled";
        displayBody = body || "An order has been cancelled.";
      } else if (notifType === "payment_settlement") {
        displayTitle = "💰 Payment Settled";
        displayBody = body || "A payment has been settled to your wallet.";
      }
      setFcmNotif({ title: displayTitle, body: displayBody, orderId: data?.orderId });
      if (fcmDismissTimer.current) clearTimeout(fcmDismissTimer.current);
      fcmDismissTimer.current = setTimeout(() => setFcmNotif(null), 5000);
    };
    /* When the vendor taps a push notification (background state), navigate
       to the specific order if orderId is provided. */
    const onNotificationTap = (data: Record<string, string>) => {
      if (data.orderId) {
        navigate(`/orders/${data.orderId}`);
      } else {
        navigate("/orders");
      }
    };
    const onPushError: PushErrorHandler = (reason) => {
      setPushError(reason);
    };

    if (Capacitor.isNativePlatform()) {
      registerPush(onForeground, onNotificationTap, onPushError).then(cleanup => {
        if (cleanup) fcmCleanupRef.current = cleanup;
      }).catch((err) => { console.warn('[artifacts/vendor-app/src/App.tsx]', err); }); // eslint-disable-line no-console
      return () => {
        fcmCleanupRef.current?.remove();
        if (fcmDismissTimer.current) clearTimeout(fcmDismissTimer.current);
      };
    }
    if (typeof Notification !== "undefined" && Notification.requestPermission) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          registerPush(undefined, undefined, onPushError).catch((err) => { console.warn('[artifacts/vendor-app/src/App.tsx]', err); }); // eslint-disable-line no-console
        } else if (perm === "denied") {
          setPushError("permission_denied");
        }
      }).catch((err) => { console.warn('[artifacts/vendor-app/src/App.tsx]', err); }); // eslint-disable-line no-console
    }

    /* Re-register whenever the vendor tab regains focus so tokens stay fresh
       and any rotation that happened while backgrounded is picked up. */
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registerPush(undefined, undefined, onPushError).catch((err) => { console.warn('[artifacts/vendor-app/src/App.tsx]', err); }); // eslint-disable-line no-console
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    /* Listen for SW_NAVIGATE messages from the service worker notificationclick handler.
       Normalize via URL() so both absolute URLs and path strings are handled safely. */
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_NAVIGATE" && event.data?.path) {
        try {
          const fullUrl = new URL(event.data.path as string, window.location.origin);
          const base = (import.meta.env.BASE_URL || "/vendor").replace(/\/$/, "");
          const appPath = fullUrl.pathname.replace(new RegExp(`^${base}`), "") || "/";
          navigate(appPath);
        } catch (err) { console.warn('[artifacts/vendor-app/src/App.tsx]', err); } // eslint-disable-line no-console
      }
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, navigate]);

  const maintenanceSince = useRef<number | null>(null);
  const [maintenanceBlocked, setMaintenanceBlocked] = useState(false);
  const [maintenanceSecs, setMaintenanceSecs] = useState(0);

  useEffect(() => {
    if (config.platform.appStatus !== "maintenance") {
      maintenanceSince.current = null;
      setMaintenanceBlocked(false);
      return;
    }
    if (maintenanceSince.current === null) {
      maintenanceSince.current = Date.now();
    }
    const tick = () => {
      const elapsed = Date.now() - (maintenanceSince.current ?? Date.now());
      const remaining = Math.max(0, Math.ceil((MAINTENANCE_GRACE_MS - elapsed) / 1000));
      setMaintenanceSecs(remaining);
      if (elapsed >= MAINTENANCE_GRACE_MS) setMaintenanceBlocked(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.platform.appStatus]);

  if (!loading && !user) {
    if (sessionExpired) return <SessionExpiredOverlay onLogin={() => { clearSessionExpired(); navigate("/login"); }} />;
    if (location === "/register") return <Register />;
    if (location === "/login") return <Login />;
    if (location === "/forgot-password") return <ForgotPassword />;
    return <GuestLanding />;
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(249,115,22,0.4)" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div style={{ width: 32, height: 32, border: "3px solid #F97316", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Loading Vendor Portal…</p>
        <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>{config.platform.appName} Business Partner</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (storageError) return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#161B22", border: "1px solid #252D3A", borderRadius: 20, padding: "28px 24px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Storage Error</h2>
        <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>Could not access browser storage. Please enable cookies and local storage for this site.</p>
        <button onClick={() => window.location.reload()} style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Reload
        </button>
      </div>
    </div>
  );

  if (!user) return <Login />;

  /* ── Approval status guards — shown after session rehydration ── */
  const supportPhone = (config.platform as Record<string, unknown>)?.supportPhone as string | undefined
    || (config.content as Record<string, unknown>)?.supportPhone as string | undefined;

  if (user.approvalStatus === "pending") return (
    <PendingApprovalScreen
      supportPhone={supportPhone}
      onRefresh={refreshUser}
      onSignOut={() => { try { logout(); } finally { window.location.reload(); } }}
    />
  );

  if (user.approvalStatus === "rejected") return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#161B22", border: "1px solid #252D3A", borderRadius: 22, padding: "32px 24px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 68, height: 68, borderRadius: 18, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Application Rejected</h2>
        <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>Your vendor account application was not approved.</p>
        {user.rejectionReason && <p style={{ color: "#fca5a5", fontSize: 13, fontWeight: 600, margin: "0 0 20px" }}>Reason: {user.rejectionReason}</p>}
        {supportPhone && (
          <a href={`tel:${supportPhone}`} style={{ display: "block", width: "100%", padding: "12px 0", marginBottom: 10, borderRadius: 12, background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Contact Support
          </a>
        )}
        <button onClick={() => { try { logout(); } finally { window.location.reload(); } }}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid #252D3A", background: "#0F1117", color: "#6B7280", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* ── Maintenance overlay: shown immediately but blocks after 5-min grace ── */}
      {config.platform.appStatus === "maintenance" && maintenanceBlocked && (
        <MaintenanceScreen message={config.content.maintenanceMsg} appName={config.platform.appName} />
      )}
      {config.platform.appStatus === "maintenance" && !maintenanceBlocked && maintenanceSecs > 0 && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-xs font-bold shadow">
          ⚠️ {config.platform.appName} is in maintenance mode. Full screen in {Math.floor(maintenanceSecs / 60)}:{String(maintenanceSecs % 60).padStart(2, "0")}
        </div>
      )}
      {/* ── Limited-service banner: non-blocking strip shown when app_status = "limited" ── */}
      {config.platform.appStatus === "limited" && (
        <div className="fixed top-0 inset-x-0 z-50 bg-orange-400 text-white text-center py-2 px-4 text-xs font-bold shadow">
          ⚠️ Limited service — some features may be temporarily unavailable
        </div>
      )}

      {/* ── Push registration error banner ── */}
      {pushError && (
        <div className="fixed top-0 left-0 right-0 z-[10001] bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 flex items-center gap-3 shadow-md">
          <span className="flex-1">
            {pushError === "permission_denied"
              ? "🔕 Order notifications are blocked. Go to browser settings → Site Settings → Notifications → Allow."
              : pushError === "network_error"
              ? "📡 Could not register for notifications. Check your connection."
              : "⚠️ Notification registration failed. Go to Settings → Test Notification to retry."}
          </span>
          <button onClick={() => setPushError(null)} className="flex-shrink-0 font-bold text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* ── FCM foreground notification banner ── */}
      {fcmNotif && (
        <button
          onClick={() => {
            if (fcmNotif.orderId) navigate(`/orders/${fcmNotif.orderId}`);
            setFcmNotif(null);
          }}
          className="fixed top-4 left-4 right-4 z-[10000] bg-orange-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-left">
          <div className="font-bold truncate">{fcmNotif.title}</div>
          <div className="text-xs opacity-90 truncate">{fcmNotif.body}</div>
        </button>
      )}

      {/* ── Announcement bar (top, dismissable) ── */}
      <AnnouncementBar message={config.content.announcement} />
      <PopupEngine />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Desktop Sidebar (hidden on mobile) ── */}
        <div className="hidden md:flex md:w-64 md:flex-shrink-0">
          <SideNav />
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto scroll-momentum"
            style={{ paddingBottom: BOTTOM_PADDING }}
            id="main-scroll"
          >
            <div className="md:max-w-5xl md:mx-auto md:px-6 md:pb-8">
              <Switch>
                <Route path="/"><ErrorBoundary><Dashboard /></ErrorBoundary></Route>
                <Suspense fallback={<PageSkeleton />}>
                <Route path="/orders/:id">{(params) => <ErrorBoundary key={`order-${params.id}`}><Orders targetOrderId={params.id} /></ErrorBoundary>}</Route>
                <Route path="/orders"><ErrorBoundary><Orders /></ErrorBoundary></Route>
                <Route path="/products"><ErrorBoundary><Products /></ErrorBoundary></Route>
                <Route path="/wallet"><ErrorBoundary><Wallet /></ErrorBoundary></Route>
                <Route path="/analytics"><ErrorBoundary><KycGate><Analytics /></KycGate></ErrorBoundary></Route>
                <Route path="/reviews"><ErrorBoundary><Reviews /></ErrorBoundary></Route>
                <Route path="/promos"><ErrorBoundary><KycGate><Promos /></KycGate></ErrorBoundary></Route>
                <Route path="/campaigns"><ErrorBoundary><KycGate><Campaigns /></KycGate></ErrorBoundary></Route>
                <Route path="/chat"><ErrorBoundary><Chat /></ErrorBoundary></Route>
                <Route path="/store"><ErrorBoundary><Store /></ErrorBoundary></Route>
                <Route path="/notifications"><ErrorBoundary><Notifications /></ErrorBoundary></Route>
                <Route path="/profile"><ErrorBoundary><Profile /></ErrorBoundary></Route>
                </Suspense>
                <Route>
                  <ErrorBoundary>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <p className="text-4xl mb-3">🔍</p>
                        <p className="text-lg font-extrabold text-gray-700">Page not found</p>
                        <p className="text-sm text-gray-400 mt-1">This page doesn't exist</p>
                        <a href="/" className="mt-4 inline-block h-10 px-6 bg-orange-500 text-white font-bold rounded-xl text-sm leading-10">← Go Home</a>
                      </div>
                    </div>
                  </ErrorBoundary>
                </Route>
              </Switch>
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

/* ── Session Expired Overlay ── */
function SessionExpiredOverlay({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#161B22", border: "1px solid #252D3A", borderRadius: 20, padding: "32px 24px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 68, height: 68, borderRadius: 18, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Session Expired</h2>
        <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>Your session has expired for security reasons. Please sign in again to continue.</p>
        <button onClick={onLogin}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 48, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxSizing: "border-box" }}>
          Sign In Again
        </button>
      </div>
    </div>
  );
}

const VersionCheckInit = React.memo(function VersionCheckInit() {
  useVersionCheck();
  return null;
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <VersionCheckInit />
        <AuthProvider>
          <ThemeProvider theme={vendorTheme}>
          <Toaster />
          <WouterRouter base={(() => {
              /* Use BASE_URL exactly as Vite computed it from vite.config's
                 `base` option:
                   "/"        → ""        (app mounted at site root)
                   "/vendor/" → "/vendor" (path-routed behind a proxy)
                 The previous logic forced "/vendor" whenever BASE_URL was
                 "/", which broke standalone deployments by mounting every
                 route under a non-existent /vendor prefix. */
              const raw = vendorEnv.baseUrl || "";
              if (!raw || typeof raw !== "string") return "";
              return raw.replace(/\/$/, "");
            })()}>
            <AppRoutes />
          </WouterRouter>
          <PwaInstallBanner />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
