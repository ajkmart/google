import { useState, useCallback } from "react";
import { Link } from "wouter";
import { api } from "../lib/api";
import { usePlatformConfig, getRiderAuthConfig } from "../lib/useConfig";
import { useLanguage } from "../lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";
import { TwoFactorVerify, executeCaptcha, formatPhoneForApi } from "@workspace/auth-utils";
import {
  ArrowLeft, Loader2, Eye, EyeOff, Phone, Mail,
  CheckCircle, KeyRound,
} from "lucide-react";
import { createLogger } from "@/lib/logger";
const log = createLogger("[ForgotPassword]");

const BG = "#0B0E11";
const SURFACE = "#131720";
const BORDER = "#252836";
const PRIMARY = "#F0B90B";
const TEXT = "#E8E9EF";
const TEXT_MUTED = "#6B7280";

type ForgotStep = "choose-method" | "send-otp" | "enter-otp" | "new-password" | "totp-verify" | "success";

function getPasswordStrength(pw: string): { level: number; label: TranslationKey; color: string; pct: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "passwordWeak",   color: "#ef4444", pct: 25 };
  if (score <= 2) return { level: 2, label: "passwordFair",   color: "#f97316", pct: 50 };
  if (score <= 3) return { level: 3, label: "passwordGood",   color: PRIMARY,   pct: 75 };
  return           { level: 4, label: "passwordStrong", color: "#10b981", pct: 100 };
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 48, padding: "0 16px", borderRadius: 12,
  background: BG, border: `1.5px solid ${BORDER}`, color: TEXT,
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
const btnPrimaryStyle: React.CSSProperties = {
  width: "100%", height: 48, borderRadius: 12, border: "none",
  background: `linear-gradient(135deg, ${PRIMARY}, #D97706)`,
  color: BG, fontSize: 15, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

export default function ForgotPassword() {
  const { config } = usePlatformConfig();
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language); // eslint-disable-line react-hooks/exhaustive-deps
  const auth = getRiderAuthConfig(config);
  const captchaSiteKey = config.auth?.captchaSiteKey;
  const phoneHint = config.regional?.phoneHint ?? "03XXXXXXXXX";
  const isValidPhone = (() => {
    try {
      if (config.regional?.phoneFormat) {
        const re = new RegExp(config.regional.phoneFormat);
        return (p: string) => re.test(p);
      }
    } catch (err) { log.warn("phoneFormat regex failed:", err); }
    return (p: string) => /^0?3\d{9}$/.test(p.replace(/[\s\-()+]/g, ""));
  })();

  const [step, setStep] = useState<ForgotStep>("choose-method");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  const clearError = () => setError("");

  const hasPhoneOtp = auth.phoneOtp;
  const hasEmailOtp = auth.emailOtp;

  const sendOtp = async () => {
    clearError();
    if (method === "phone" && (!phone || !isValidPhone(phone))) { setError(`${T("enterValidPhone")} (e.g. ${phoneHint})`); return; }
    if (method === "email" && (!email || !email.includes("@"))) { setError(T("enterValidEmail")); return; }
    setLoading(true);
    try {
      let captchaToken: string | undefined;
      if (auth.captchaEnabled) {
        try { captchaToken = await executeCaptcha("forgot_password", captchaSiteKey); } catch (err) { log.warn("captcha failed:", err); }
        if (!captchaToken) { setError(T("captchaRequired")); setLoading(false); return; }
      }
      const res = await api.forgotPassword({
        method,
        ...(method === "phone" ? { phone: formatPhoneForApi(phone) } : { email }),
        captchaToken,
      });
      if (res.otp) setDevOtp(res.otp);
      setStep("enter-otp");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : T("sendOtpFailed")); }
    setLoading(false);
  };

  const verifyOtpAndSetPassword = async (totpCode?: string) => {
    clearError();
    if (!otp || otp.length < 6) { setError(T("enterOtpDigits")); return; }
    if (newPassword.length < 8) { setError(T("passwordMinLength")); return; }
    if (newPassword !== confirmPw) { setError(T("passwordsDoNotMatch")); return; }
    setLoading(true);
    try {
      let captchaToken: string | undefined;
      if (auth.captchaEnabled) {
        try { captchaToken = await executeCaptcha("reset_password", captchaSiteKey); } catch (err) { log.warn("captcha failed:", err); }
        if (!captchaToken) { setError(T("captchaRequired")); setLoading(false); return; }
      }
      await api.resetPassword({
        ...(method === "phone" ? { phone: formatPhoneForApi(phone) } : { email }),
        otp, newPassword, captchaToken,
        ...(totpCode ? { totpCode } : {}),
      });
      setStep("success");
    } catch (e: unknown) {
      const errObj = e as { responseData?: { requires2FA?: boolean } };
      if (errObj?.responseData?.requires2FA) { setStep("totp-verify"); setLoading(false); return; }
      setError(e instanceof Error ? e.message : T("verificationFailed"));
    }
    setLoading(false);
  };

  const handle2faVerify = useCallback(async (code: string) => {
    setTwoFaLoading(true); setTwoFaError("");
    try {
      let captchaToken: string | undefined;
      if (auth.captchaEnabled) {
        try { captchaToken = await executeCaptcha("reset_password_2fa", captchaSiteKey); } catch (err) { log.warn("captcha failed:", err); }
      }
      await api.resetPassword({
        ...(method === "phone" ? { phone: formatPhoneForApi(phone) } : { email }),
        otp, newPassword, totpCode: code, captchaToken,
      });
      setStep("success");
    } catch (e: unknown) { setTwoFaError(e instanceof Error ? e.message : T("verificationFailed")); }
    setTwoFaLoading(false);
  }, [method, phone, email, otp, newPassword, auth.captchaEnabled, captchaSiteKey, T]);

  const handle2faBackup = useCallback(async (code: string) => { handle2faVerify(code); }, [handle2faVerify]);

  const cardStyle: React.CSSProperties = {
    background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20,
    padding: "24px 22px", width: "100%", maxWidth: 400,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: BG,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "24px 16px",
  };

  if (step === "success") {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${PRIMARY}15`, border: `1px solid ${PRIMARY}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle size={36} color={PRIMARY} />
          </div>
          <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{T("passwordResetSuccess")}</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>{T("passwordResetSuccessMsg")}</p>
          <Link href="/" style={{ ...btnPrimaryStyle as React.CSSProperties, display: "flex", textDecoration: "none", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <ArrowLeft size={15} /> {T("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  if (step === "totp-verify") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <button onClick={() => setStep("new-password")}
            style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <ArrowLeft size={14} /> {T("back")}
          </button>
          <TwoFactorVerify
            onVerify={handle2faVerify}
            onBackupCode={handle2faBackup}
            verifyLoading={twoFaLoading}
            verifyError={twoFaError}
            showTrustDevice={false}
          />
        </div>
      </div>
    );
  }

  const strength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <div style={pageStyle}>
      {/* Branded header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: `linear-gradient(135deg, ${PRIMARY}, #D97706)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", boxShadow: `0 8px 24px ${PRIMARY}40`,
        }}>
          <KeyRound size={26} color={BG} />
        </div>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{T("forgotPassword")}</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>{T("forgotPasswordDesc")}</p>
      </div>

      <div style={cardStyle}>
        {step !== "choose-method" && (
          <button onClick={() => {
            if (step === "send-otp") setStep("choose-method");
            else if (step === "enter-otp") setStep("send-otp");
            else if (step === "new-password") setStep("enter-otp");
            clearError();
          }}
            style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <ArrowLeft size={14} /> {T("back")}
          </button>
        )}

        {step === "choose-method" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>{T("chooseResetMethod")}</h3>
            {hasPhoneOtp && (
              <button onClick={() => { setMethod("phone"); setStep("send-otp"); }}
                style={{ height: 56, border: `1px solid ${BORDER}`, borderRadius: 14, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", transition: "all 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${PRIMARY}60`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <Phone size={20} color={PRIMARY} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{T("resetViaPhone")}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11 }}>OTP via SMS</div>
                </div>
              </button>
            )}
            {hasEmailOtp && (
              <button onClick={() => { setMethod("email"); setStep("send-otp"); }}
                style={{ height: 56, border: `1px solid ${BORDER}`, borderRadius: 14, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", transition: "all 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${PRIMARY}60`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <Mail size={20} color={PRIMARY} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{T("resetViaEmail")}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11 }}>OTP via Email</div>
                </div>
              </button>
            )}
          </div>
        )}

        {step === "send-otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {method === "phone" ? (
              <>
                <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{T("resetViaPhone")}</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ height: 48, padding: "0 12px", background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 12, display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: TEXT_MUTED }}>+92</div>
                  <input type="tel" value={phone}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.startsWith("92")) v = v.slice(2);
                      if (v.startsWith("0")) v = v.slice(1);
                      setPhone(v.slice(0, 10));
                    }}
                    placeholder={phoneHint}
                    onKeyDown={e => e.key === "Enter" && void sendOtp()}
                    style={{ ...inputStyle, flex: 1 }} autoFocus />
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{T("resetViaEmail")}</h3>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  onKeyDown={e => e.key === "Enter" && void sendOtp()}
                  style={inputStyle} autoFocus />
              </>
            )}
            <button onClick={() => void sendOtp()} disabled={loading}
              style={{ ...btnPrimaryStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? T("pleaseWait") : T("sendResetOtp")}
            </button>
          </div>
        )}

        {step === "enter-otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{T("enterResetOtp")}</h3>
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>{method === "phone" ? `+92${phone}` : email}</p>
            {import.meta.env.DEV && devOtp && (
              <div style={{ background: "#1a2035", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>
                <strong>{T("devOtp")}:</strong> <span style={{ color: PRIMARY }}>{devOtp}</span>
              </div>
            )}
            <input type="number" placeholder={T("enterOtpDigits")} value={otp} onChange={e => setOtp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && setStep("new-password")}
              style={{ ...inputStyle, textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: "0.3em", height: 56 }}
              maxLength={6} autoFocus />
            <button onClick={() => { if (otp.length >= 6) setStep("new-password"); else setError(T("enterOtpDigits")); }}
              style={btnPrimaryStyle}>
              {T("nextStep")}
            </button>
            <button onClick={() => void sendOtp()}
              style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, cursor: "pointer", padding: "4px 0", textAlign: "center" }}
              onMouseEnter={e => (e.currentTarget.style.color = PRIMARY)}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
              {T("resendOtp")}
            </button>
          </div>
        )}

        {step === "new-password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{T("newPassword")}</h3>
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder={T("newPassword")} style={{ ...inputStyle, paddingRight: 44 }} autoFocus />
              <button onClick={() => setShowPwd(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", padding: 0 }}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {strength && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 4, background: BORDER, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 4, transition: "all 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: strength.color, minWidth: 40 }}>{T(strength.label)}</span>
                </div>
              </div>
            )}
            <input type={showPwd ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder={T("confirmNewPassword")} style={{
                ...inputStyle,
                borderColor: confirmPw && newPassword !== confirmPw ? "#ef4444" : confirmPw && newPassword === confirmPw ? "#10b981" : BORDER,
              }} />
            {confirmPw && newPassword !== confirmPw && (
              <p style={{ fontSize: 10, color: "#ef4444", margin: "-8px 0 0" }}>{T("passwordsDoNotMatch")}</p>
            )}
            <button onClick={() => void verifyOtpAndSetPassword()} disabled={loading}
              style={{ ...btnPrimaryStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? T("pleaseWait") : T("resetPassword")}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" aria-live="polite" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginTop: 12 }}>
            {error}
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/" style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = PRIMARY)}
            onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
            {T("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
