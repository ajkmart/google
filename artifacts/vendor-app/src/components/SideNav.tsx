import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/vendor-auth";
import { api } from "../lib/api";
import { usePlatformConfig, useCurrency } from "../lib/useConfig";
import { useLanguage } from "../lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";
import { fc } from "../lib/ui";

const items: { href: string; labelKey: TranslationKey; icon: string; descKey: TranslationKey }[] = [
  { href: "/",           labelKey: "dashboard",      icon: "📊", descKey: "overviewStats"       },
  { href: "/orders",     labelKey: "orders",         icon: "📦", descKey: "manageOrdersShort"   },
  { href: "/products",   labelKey: "products",       icon: "🍽️", descKey: "yourMenuStock"       },
  { href: "/wallet",     labelKey: "wallet",         icon: "💰", descKey: "earningsPayoutsShort" },
  { href: "/analytics",  labelKey: "analytics",      icon: "📈", descKey: "salesPerf"           },
  { href: "/chat",       labelKey: "chat",           icon: "💬", descKey: "customerFeedback"    },
  { href: "/reviews",    labelKey: "reviews",        icon: "⭐", descKey: "customerFeedback"    },
  { href: "/promos",     labelKey: "promosLabel",    icon: "🏷️", descKey: "salesPerf"           },
  { href: "/campaigns",  labelKey: "campaignsLabel", icon: "🎯", descKey: "salesPerf"           },
  { href: "/store",      labelKey: "myStore",        icon: "🏪", descKey: "settingsAndHours"    },
  { href: "/profile",    labelKey: "account",        icon: "👤", descKey: "profileAndSecurity"  },
];

export function SideNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { config } = usePlatformConfig();
  const { symbol: currencySymbol } = useCurrency();
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);

  const { data: notifData } = useQuery({
    queryKey: ["vendor-notifs-count"],
    queryFn: () => api.getNotifications(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const unread: number = notifData?.unread || 0;

  return (
    <aside
      className="hidden md:flex flex-col w-64 min-h-screen fixed left-0 top-0 z-30"
      style={{
        background: "#0D1117",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.30)",
      }}
    >
      {/* ── Store Header ── */}
      <div
        className="px-5 py-5 relative overflow-hidden flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #1A56DB 0%, #1348B5 60%, #0F3499 100%)" }}
      >
        {/* Decorative glow */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)" }} />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>
            <span className="text-xl">🏪</span>
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-white text-sm leading-tight truncate">{user?.storeName || T("myStore")}</p>
            <p className="text-blue-200 text-xs font-medium opacity-80">{config.platform.appName} Vendor</p>
          </div>
        </div>

        <div className="relative mt-3 flex items-center justify-between">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={user?.storeIsOpen
              ? { background: "rgba(16,185,129,0.25)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.30)" }
              : { background: "rgba(239,68,68,0.22)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.28)" }
            }
          >
            {user?.storeIsOpen ? `🟢 ${T("openLabel")}` : `🔴 ${T("closedLabel")}`}
          </span>
          <span className="text-xs font-semibold" style={{ color: "rgba(219,234,254,0.70)" }}>
            {Math.round(100 - (config.platform.vendorCommissionPct ?? 15))}% earnings
          </span>
        </div>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
              style={active
                ? { background: "rgba(26,86,219,0.16)", border: "1px solid rgba(26,86,219,0.28)" }
                : { background: "transparent", border: "1px solid transparent" }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {/* Icon */}
              <span
                className="text-lg w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all"
                style={active
                  ? { background: "rgba(26,86,219,0.25)" }
                  : { background: "rgba(255,255,255,0.06)" }
                }
              >
                {item.icon}
              </span>

              {/* Label + desc */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate transition-colors"
                  style={{ color: active ? "#93BBFE" : "#CBD5E1" }}>
                  {T(item.labelKey)}
                </p>
                <p className="text-xs truncate" style={{ color: "#374151" }}>
                  {T(item.descKey)}
                </p>
              </div>

              {/* Notification badge */}
              {item.href === "/profile" && unread > 0 && (
                <span className="text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                  style={{ background: "#EF4444", color: "white" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}

              {/* Active accent bar */}
              {active && (
                <div className="ml-auto w-1 h-5 rounded-full flex-shrink-0"
                  style={{ background: "linear-gradient(180deg, #60A5FA, #1A56DB)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Wallet + Logout Footer ── */}
      <div className="px-2.5 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/wallet">
          <div
            className="px-3 py-2.5 rounded-xl cursor-pointer mb-2 transition-all"
            style={{ background: "rgba(26,86,219,0.12)", border: "1px solid rgba(26,86,219,0.20)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(26,86,219,0.18)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(26,86,219,0.12)")}
          >
            <p className="text-xs font-medium mb-0.5" style={{ color: "#6B7280" }}>{T("walletBalanceLabel")}</p>
            <p className="text-lg font-extrabold" style={{ color: "#60A5FA" }}>
              {fc(user?.walletBalance ?? "0", currencySymbol)}
            </p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: "#F87171", background: "transparent" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.10)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <span>🚪</span> {T("logout")}
        </button>
      </div>
    </aside>
  );
}
