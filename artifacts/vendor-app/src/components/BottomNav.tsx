import { Link, useLocation } from "wouter";
import { useLanguage } from "../lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: string }[] = [
  { href: "/",           labelKey: "dashboard",      icon: "📊" },
  { href: "/orders",     labelKey: "orders",         icon: "📦" },
  { href: "/chat",       labelKey: "chat",           icon: "💬" },
  { href: "/products",   labelKey: "products",       icon: "🍽️" },
  { href: "/wallet",     labelKey: "wallet",         icon: "💰" },
  { href: "/profile",    labelKey: "account",        icon: "👤" },
];

export function BottomNav() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "#0D1117",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.40)",
        paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
      }}
    >
      <div className="flex">
        {navItems.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 relative android-press min-h-0"
            >
              {/* Active top indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #1A56DB, #60A5FA)" }} />
              )}
              {/* Icon container */}
              <span
                className="flex items-center justify-center w-10 h-7 rounded-xl text-xl transition-all duration-200"
                style={active ? { background: "rgba(26,86,219,0.18)" } : {}}
              >
                {item.icon}
              </span>
              {/* Label */}
              <span
                className="text-[10px] font-bold leading-none transition-colors"
                style={{ color: active ? "#60A5FA" : "#4B5563" }}
              >
                {T(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
