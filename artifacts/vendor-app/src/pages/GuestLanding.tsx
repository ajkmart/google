import { useState, useEffect } from "react";
import { createLogger } from "@/lib/logger";
const log = createLogger("[guest]");
import { useLocation } from "wouter";
import type { Language } from "@workspace/i18n";
import { isRTL } from "@workspace/i18n";

const LS_KEY = "ajkmart_vendor_lang";
const LANG_CYCLE: Language[] = ["en", "ur", "roman"];
const LANG_LABELS: Record<string, string> = { en: "EN", ur: "اردو", roman: "RM" };

function readLang(): Language {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "en" || v === "ur" || v === "roman") return v;
  } catch (e) { log.debug("[guest] localStorage unavailable:", e); }
  return "en";
}

function saveLang(lang: Language) {
  try {
    localStorage.setItem(LS_KEY, lang);
    const dir = isRTL(lang) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
  } catch (e) { log.debug("[guest] localStorage unavailable:", e); }
}

function cycleLang(current: Language): Language {
  const idx = LANG_CYCLE.indexOf(current);
  return LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
}

const TRUST = {
  en:    [{ v: "4,200+", l: "Active vendors" }, { v: "18", l: "Cities" }, { v: "2.1M+", l: "Orders processed" }],
  ur:    [{ v: "4,200+", l: "فعال وینڈرز" }, { v: "18", l: "شہر" }, { v: "2.1M+", l: "آرڈر مکمل" }],
  roman: [{ v: "4,200+", l: "Active vendors" }, { v: "18", l: "Shehar" }, { v: "2.1M+", l: "Orders mukammal" }],
};

const FEATURES = {
  en: [
    { icon: "📋", title: "Order Dashboard", desc: "Accept, manage, and track every order in real time — with push alerts for new arrivals." },
    { icon: "📊", title: "Sales Analytics", desc: "Revenue charts, top-selling products, and daily summaries help you make smarter decisions." },
    { icon: "📦", title: "Product Management", desc: "Upload items, set prices, manage stock levels, and run promotions — all from one screen." },
  ],
  ur: [
    { icon: "📋", title: "آرڈر ڈیش بورڈ", desc: "ہر آرڈر کو حقیقی وقت میں قبول کریں اور ٹریک کریں — نئے آرڈرز کے فوری الرٹ کے ساتھ۔" },
    { icon: "📊", title: "سیلز اینالیٹکس", desc: "آمدنی چارٹس، بہترین فروخت مصنوعات اور یومیہ خلاصہ بہتر فیصلے کرنے میں مدد دیتے ہیں۔" },
    { icon: "📦", title: "پروڈکٹ مینجمنٹ", desc: "اشیاء اپلوڈ کریں، قیمتیں سیٹ کریں، اسٹاک منیج کریں اور پروموشن چلائیں — ایک ہی اسکرین سے۔" },
  ],
  roman: [
    { icon: "📋", title: "Order Dashboard", desc: "Har order ko haqiqi waqt mein qabool karein aur track karein — nayi orders ke fori alerts ke sath." },
    { icon: "📊", title: "Sales Analytics", desc: "Amdani charts, behtareen farokht products aur yaumia khulasa behtareen faisale karne mein madadgar hain." },
    { icon: "📦", title: "Product Management", desc: "Ashiya upload karein, qeematein set karein, stock manage karein — ek hi screen se." },
  ],
};

const STEPS = {
  en: [
    { n: "01", title: "Register Your Store", desc: "Sign up with your phone or email and provide your store name and category." },
    { n: "02", title: "Add Your Products", desc: "Upload product photos, set prices and stock levels. Go live in minutes." },
    { n: "03", title: "Receive & Deliver", desc: "Accept orders from the dashboard, track delivery, and get paid to your wallet." },
  ],
  ur: [
    { n: "01", title: "اپنی دکان رجسٹر کریں", desc: "فون یا ای میل سے سائن اپ کریں اور دکان کا نام اور کیٹگری دیں۔" },
    { n: "02", title: "مصنوعات شامل کریں", desc: "پروڈکٹ تصاویر اپلوڈ کریں، قیمتیں اور اسٹاک سیٹ کریں۔ منٹوں میں لائیو ہوں۔" },
    { n: "03", title: "آرڈر وصول کریں", desc: "ڈیش بورڈ سے آرڈر قبول کریں، ڈیلیوری ٹریک کریں اور والیٹ میں ادائیگی پائیں۔" },
  ],
  roman: [
    { n: "01", title: "Store Register Karein", desc: "Phone ya email se sign up karein aur apni dukaan ka naam aur category dein." },
    { n: "02", title: "Products Add Karein", desc: "Product tasveerein upload karein, qeematein set karein — minutes mein live hon." },
    { n: "03", title: "Orders Receive Karein", desc: "Dashboard se order qabool karein, delivery track karein, wallet mein payment payein." },
  ],
};

const BENEFITS = {
  en:    ["Instant order notifications", "Real-time inventory control", "Weekly payout to wallet", "Dedicated vendor support", "Sales reports & analytics", "Promotional tools"],
  ur:    ["فوری آرڈر اطلاعات", "حقیقی وقت انوینٹری", "ہفتہ وار والیٹ ادائیگی", "وقف وینڈر سپورٹ", "سیلز رپورٹس", "پروموشنل ٹولز"],
  roman: ["Fori order alerts", "Real-time inventory", "Weekly wallet payment", "Vendor support", "Sales reports", "Promotional tools"],
};

const CONTENT = {
  en: {
    appName: "AJKMart Vendor",
    tagline: "Sell Smart. Grow Fast.",
    heroTitle: "Your Shop,\nDigitally Supercharged.",
    heroSub: "List products, manage orders, run promotions, and grow your business — all from one powerful vendor dashboard.",
    ctaLogin: "Login",
    ctaRegister: "Open Your Shop",
    trustTitle: "Trusted by thousands of vendors",
    featuresTitle: "Everything your business needs",
    stepsTitle: "Start selling in 3 easy steps",
    benefitsTitle: "Why vendors love AJKMart",
    footerCta: "Ready to grow your business?",
    footerBtn: "Open Your Store Today",
    footer: "© 2026 AJKMart · Vendor Platform",
  },
  ur: {
    appName: "اے جے کے مارٹ وینڈر",
    tagline: "سمارٹ بیچیں۔ تیزی سے بڑھیں۔",
    heroTitle: "آپ کی دکان،\nڈیجیٹل طاقت کے ساتھ۔",
    heroSub: "مصنوعات فہرست کریں، آرڈر منیج کریں، پروموشن چلائیں اور ایک طاقتور ڈیش بورڈ سے اپنا کاروبار بڑھائیں۔",
    ctaLogin: "لاگ ان",
    ctaRegister: "دکان کھولیں",
    trustTitle: "ہزاروں وینڈرز کا اعتماد",
    featuresTitle: "آپ کے کاروبار کے لیے سب کچھ",
    stepsTitle: "۳ آسان مراحل میں فروخت شروع کریں",
    benefitsTitle: "وینڈرز اے جے کے مارٹ کو کیوں پسند کرتے ہیں",
    footerCta: "اپنا کاروبار بڑھانے کے لیے تیار ہیں؟",
    footerBtn: "آج اپنی دکان کھولیں",
    footer: "© 2026 اے جے کے مارٹ · وینڈر پلیٹ فارم",
  },
  roman: {
    appName: "AJKMart Vendor",
    tagline: "Smart Bechayn. Tezi Se Barhayn.",
    heroTitle: "Aapki Dukaan,\nDigital Taaqat Ke Sath.",
    heroSub: "Products list karein, orders manage karein, promotions chalayein — ek powerful dashboard se karobar barhaayein.",
    ctaLogin: "Login Karein",
    ctaRegister: "Dukaan Kholyein",
    trustTitle: "Hazaron vendors ka aitmaad",
    featuresTitle: "Aapke karobar ke liye sab kuch",
    stepsTitle: "3 aasaan steps mein bechna shuru karein",
    benefitsTitle: "Vendors AJKMart ko kyun pasand karte hain",
    footerCta: "Apna karobar barhaane ke liye tayyar hain?",
    footerBtn: "Aaj Apni Dukaan Kholyein",
    footer: "© 2026 AJKMart · Vendor Platform",
  },
};

const ORANGE = "#f97316";
const ORANGE_DARK = "#ea580c";
const ORANGE_LIGHT = "#fed7aa";
const ORANGE_BG = "#fff7ed";

export function GuestLanding() {
  const [, navigate] = useLocation();
  const [language, setLangState] = useState<Language>(readLang);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { saveLang(language); }, [language]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function handleLangToggle() {
    setLangState(cycleLang(language));
  }

  const C = CONTENT[language as keyof typeof CONTENT] ?? CONTENT.en;
  const trust = TRUST[language as keyof typeof TRUST] ?? TRUST.en;
  const features = FEATURES[language as keyof typeof FEATURES] ?? FEATURES.en;
  const steps = STEPS[language as keyof typeof STEPS] ?? STEPS.en;
  const benefits = BENEFITS[language as keyof typeof BENEFITS] ?? BENEFITS.en;
  const rtl = isRTL(language);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden" dir={rtl ? "rtl" : "ltr"}>

      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-orange-100"
        style={{
          height: scrolled ? 52 : 64,
          boxShadow: scrolled ? "0 2px 8px rgba(0,0,0,0.10)" : "0 1px 2px rgba(0,0,0,0.05)",
          transition: "height 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between gap-3" style={{ height: "100%" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm"
              style={{ width: scrolled ? 32 : 40, height: scrolled ? 32 : 40, background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`, transition: "all 0.2s" }}>
              <svg width={scrolled ? 16 : 20} height={scrolled ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <span className="font-extrabold text-base leading-tight truncate" style={{ color: ORANGE_DARK }}>{C.appName}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLangToggle}
              className="h-9 px-3 rounded-full text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: ORANGE_BG, border: `1px solid ${ORANGE_LIGHT}`, color: ORANGE_DARK }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {LANG_LABELS[language] ?? "EN"}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="h-9 px-4 rounded-xl text-xs font-bold transition-colors hover:bg-orange-50 cursor-pointer"
              style={{ border: `1px solid ${ORANGE_LIGHT}`, color: ORANGE_DARK, backgroundColor: "transparent" }}
            >
              {C.ctaLogin}
            </button>
            <button
              onClick={() => navigate("/register")}
              className="h-9 px-4 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
              style={{ backgroundColor: ORANGE, border: "none", transition: "background-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ORANGE_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ORANGE)}
            >
              {C.ctaRegister}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #f59e0b 55%, #eab308 100%)` }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 start-0 w-96 h-96 rounded-full opacity-15 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: "white" }} />
          <div className="absolute bottom-0 end-0 w-72 h-72 rounded-full opacity-10 translate-x-1/3 translate-y-1/3" style={{ backgroundColor: "white" }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-start">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-5 tracking-wide"
              style={{ backgroundColor: "rgba(255,255,255,0.20)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {C.tagline}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 whitespace-pre-line">{C.heroTitle}</h1>
            <p className="text-base md:text-lg leading-relaxed mb-8 max-w-md" style={{ color: "rgba(255,255,255,0.88)" }}>{C.heroSub}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button
                onClick={() => navigate("/register")}
                className="h-12 px-8 rounded-2xl font-extrabold text-sm shadow-xl cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: "white", color: ORANGE_DARK, border: "none", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.92")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {C.ctaRegister}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button
                onClick={() => navigate("/login")}
                className="h-12 px-8 rounded-2xl font-bold text-sm text-white cursor-pointer"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
              >
                {C.ctaLogin}
              </button>
            </div>
          </div>

          {/* ── Dashboard Preview Card ── */}
          <div className="flex-shrink-0 w-64 md:w-80" aria-hidden="true">
            <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "rgba(255,255,255,0.12)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-60" />
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-40" />
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-25" />
                <span className="text-xs font-semibold ms-2 opacity-80">Vendor Dashboard</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white opacity-70">Today's Revenue</div>
                    <div className="text-base font-extrabold text-white">₨ 18,450</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.3)", color: "#6ee7b7" }}>+12%</span>
                </div>
                {[
                  { status: "New", item: "Chicken Karahi ×2", time: "2m ago", dot: "#10b981" },
                  { status: "Preparing", item: "Beef Pulao ×1", time: "8m ago", dot: "#f59e0b" },
                  { status: "Delivered", item: "Pakora Tray ×3", time: "22m ago", dot: "#6366f1" },
                ].map((o, i) => (
                  <div key={i} className="rounded-xl p-2.5 flex items-center gap-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white opacity-90 truncate">{o.item}</div>
                      <div className="text-[10px] text-white opacity-50">{o.time}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="bg-white border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-orange-400 pt-6 pb-2 uppercase tracking-widest">{C.trustTitle}</p>
          <div className="flex divide-x divide-orange-100 pb-6">
            {trust.map((s, i) => (
              <div key={i} className="flex-1 text-center py-3 px-4">
                <div className="text-2xl font-extrabold mb-0.5" style={{ color: ORANGE_DARK }}>{s.v}</div>
                <div className="text-xs text-gray-500 font-medium">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-10">{C.featuresTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: ORANGE_BG }}>
                {f.icon}
              </div>
              <h3 className="font-extrabold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-14 border-t border-b border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-12">{C.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-base mb-5 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`, color: "white", letterSpacing: "-0.04em" }}>
                  {s.n}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 end-0 w-1/3 h-px" style={{ background: `linear-gradient(to right, ${ORANGE_LIGHT}, transparent)` }} />
                )}
                <h3 className="font-extrabold text-gray-800 mb-2 text-base">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-14" style={{ backgroundColor: ORANGE_BG }}>
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-10">{C.benefitsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 shadow-sm border border-orange-100">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})` }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 text-xs font-semibold leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="text-white py-16 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${ORANGE_DARK} 0%, #b45309 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 end-0 w-80 h-80 rounded-full opacity-10 translate-x-1/3 -translate-y-1/2" style={{ backgroundColor: "white" }} />
        </div>
        <div className="relative max-w-lg mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6">{C.footerCta}</h2>
          <button
            onClick={() => navigate("/register")}
            className="h-14 px-10 rounded-2xl font-extrabold text-base shadow-xl cursor-pointer inline-flex items-center gap-2"
            style={{ backgroundColor: "white", color: ORANGE_DARK, border: "none", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {C.footerBtn}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 text-center text-xs py-6 px-4 flex items-center justify-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        {C.footer}
      </footer>
    </div>
  );
}

export default GuestLanding;
