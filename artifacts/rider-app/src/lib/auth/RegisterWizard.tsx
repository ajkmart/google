/**
 * RegisterWizard.tsx — rider-app
 *
 * Multi-step registration wizard for riders:
 *   Phone → OTP → CNIC/Vehicle → Documents → Password → Done
 *
 * Wraps @workspace/auth-react RegisterScreen with rider-specific
 * step configuration, API wiring, and theme tokens.
 *
 * Form drafts are saved to localStorage so users can resume.
 * Passwords are excluded from the draft to avoid plain-text storage.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { RegisterScreen } from "@workspace/auth-react";
import type { StepConfig, StepComponentProps } from "@workspace/auth-react";
import { useTheme } from "./ThemeContext";
import { captureDeviceMeta } from "../deviceMeta";
import { useAuthOps } from "./useAuth";
import { api } from "../api";
import { usePlatformConfig } from "../useConfig";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { useLanguage } from "../useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";
import { Lock, Phone, ArrowLeft, Clock, Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { RegisterStepDocuments, type UploadedDoc } from "../../pages/register/RegisterStepDocuments";
import { isValidPhone, isValidCnic } from "@workspace/phone-utils";

const DRAFT_KEY = "rider_reg_draft";
const DRAFT_TTL_KEY = "rider_reg_draft_ts";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/* ── Validate Pakistani phone: 03XXXXXXXXX (11 digits, starts with 03) ── */
function isValidPakistaniPhone(phone: string): boolean {
  return isValidPhone(phone);
}

/* ── Step 1: Phone + Personal Info ──────────────────────────────────────────── */
function PhoneInfoStep({ data, onChange, onError }: StepComponentProps) {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const theme = useTheme();

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const username = (data.username as string) ?? "";
    if (!username || username.length < 3) { setUsernameStatus("idle"); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setUsernameStatus("checking");
      try {
        const res = await api.checkAvailable({ username }, abortRef.current.signal);
        setUsernameStatus(res.username && !res.username.available ? "taken" : "available");
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setUsernameStatus("idle");
      }
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); if (abortRef.current) abortRef.current.abort(); };
  }, [data.username]);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-1" style={{ color: theme.text }}>{T("personalInfo")}</h3>
      <p className="text-sm mb-4" style={{ color: theme.textMuted }}>{T("enterDetailsToGetStarted")}</p>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("fullName")} *</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.name as string) ?? ""} onChange={e => { onChange("name", e.target.value); onError(""); }} placeholder="Muhammad Ali" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("phoneNumber")} *</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.phone as string) ?? ""} onChange={e => { onChange("phone", e.target.value); onError(""); }} placeholder="03XXXXXXXXX" inputMode="tel" maxLength={11} />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("username")}</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.username as string) ?? ""} onChange={e => { onChange("username", e.target.value); onError(""); }} placeholder="ali_rider" />
        {usernameStatus === "checking" && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Checking availability…</p>}
        {usernameStatus === "taken" && <p role="alert" aria-live="polite" className="text-red-400 text-xs mt-1">Username already taken</p>}
        {usernameStatus === "available" && <p role="status" aria-live="polite" className="text-green-400 text-xs mt-1">Username available</p>}
      </div>
    </div>
  );
}

/* ── Step 2: OTP Verify ────────────────────────────────────────────── */
function OtpStep({ data, onChange, onError, onComplete }: StepComponentProps & { onComplete?: (otp: string) => void }) {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const { sendOtp } = useAuthOps();
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    const chars = otp.split("");
    chars[i] = v;
    const next = chars.join("").slice(0, 6);
    setOtp(next);
    onChange("otp", next);
    onError("");
    if (v && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.length === 6) onComplete?.(next);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    setOtp(pasted);
    onChange("otp", pasted);
    onError("");
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  };

  const handleResend = async () => {
    const phone = (data.phone as string) ?? "";
    if (!phone || resending || resendCooldown > 0) return;
    setResending(true);
    const result = await sendOtp(phone);
    setResending(false);
    if (!result.success) {
      onError(result.error ?? "Failed to resend OTP. Please try again.");
      return;
    }
    setResendCooldown(30);
  };

  const theme = useTheme();
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ border: `1px solid ${theme.primary}4D`, backgroundColor: `${theme.primary}14` }}>
        <Phone size={28} style={{ color: theme.primary }} />
      </div>
      <h3 className="font-bold text-xl mb-2" style={{ color: theme.text }}>{T("verifyPhone")}</h3>
      <p className="text-sm mb-6" style={{ color: theme.textMuted }}>{T("enterOtpSentTo")} <strong style={{ color: theme.text }}>{(data.phone as string) ?? ""}</strong></p>
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) => (
          <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={otp[i] ?? ""}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-12 h-14 rounded-xl text-center text-xl font-bold focus:outline-none transition-all"
            style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: theme.textMuted }}>
        {T("didntReceiveOtp")}{" "}
        {resendCooldown > 0
          ? <span style={{ color: theme.textMuted }}>Resend in {resendCooldown}s</span>
          : <button type="button" onClick={handleResend} disabled={resending} className="font-semibold disabled:opacity-50" style={{ color: theme.primary }}>
              {resending ? "Sending…" : T("resend")}
            </button>
        }
      </p>
    </div>
  );
}

/* ── Step 3: CNIC + Vehicle Info ────────────────────────────────── */
function VehicleStep({ data, onChange, onError }: StepComponentProps) {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const theme = useTheme();

  const VEHICLE_TYPES = ["Bike", "Car", "Van", "Pickup", "Rickshaw"];

  const formatCnic = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-1" style={{ color: theme.text }}>{T("vehicleInfo")}</h3>
      <p className="text-sm mb-4" style={{ color: theme.textMuted }}>{T("enterVehicleDetails")}</p>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("cnicNumber")}</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.cnic as string) ?? ""}
          onChange={e => { onChange("cnic", formatCnic(e.target.value)); onError(""); }}
          placeholder="XXXXX-XXXXXXX-X (optional)" maxLength={15} inputMode="numeric" />
        {(data.cnic as string)?.length > 0 && !isValidCnic((data.cnic as string) ?? "") && (
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Format: XXXXX-XXXXXXX-X</p>
        )}
        <p className="text-xs mt-1" style={{ color: theme.textMuted, opacity: 0.7 }}>Optional — you can complete this in your profile after registration.</p>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("vehicleType")} *</label>
        <select className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all appearance-none"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.vehicleType as string) ?? ""} onChange={e => { onChange("vehicleType", e.target.value); onError(""); }}>
          <option value="">{T("selectVehicleType")}</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("drivingLicense")} *</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.drivingLicense as string) ?? ""} onChange={e => { onChange("drivingLicense", e.target.value); onError(""); }} placeholder="License number" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("vehicleRegistration")} *</label>
        <input className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
          value={(data.vehicleRegistration as string) ?? ""} onChange={e => { onChange("vehicleRegistration", e.target.value); onError(""); }} placeholder="Registration number" />
      </div>
    </div>
  );
}

/* ── Step 4: KYC Document Uploads — wraps RegisterStepDocuments ──────── */
function DocumentsStep({ data, onChange, onError }: StepComponentProps) {
  const [optimisingField, setOptimisingField] = useState("");
  const [uploadingField, setUploadingField]   = useState("");
  const [uploadErrors, setUploadErrors]       = useState<Record<string, string>>({});
  const [lastFiles, setLastFiles]             = useState<Record<string, File>>({});

  /* Derive UploadedDoc from step data (keyed by backend field names). */
  const makeDoc = (dataKey: string): UploadedDoc | null => {
    const url = (data[dataKey] as string) ?? "";
    return url ? { label: dataKey, url, preview: url } : null;
  };

  /* handleFileUpload satisfies RegisterStepDocuments.handleFileUpload signature.
     Each document upload fetches its own fresh one-time token — the server
     marks every token as consumed after the first successful use, so tokens
     cannot be shared across multiple uploads. */
  const handleFileUpload = async (
    file: File,
    field: string,
    setter: (d: UploadedDoc) => void,
  ) => {
    setLastFiles(prev => ({ ...prev, [field]: file }));
    setUploadingField(field);
    setUploadErrors(prev => ({ ...prev, [field]: "" }));
    try {
      const token = await api.getRegistrationUploadToken();
      let res: { url?: string };
      try {
        res = await api.uploadRegistrationDocWithToken(file, token) as { url?: string };
      } catch (e: unknown) {
        const status = (e as { status?: number })?.status;
        if (status === 401 || status === 403) {
          const freshToken = await api.getRegistrationUploadToken();
          res = await api.uploadRegistrationDocWithToken(file, freshToken) as { url?: string };
        } else throw e;
      }
      if (!res?.url) throw new Error("No URL returned from upload");
      const preview = URL.createObjectURL(file);
      setter({ label: field, url: res.url, preview });
      onError("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadErrors(prev => ({ ...prev, [field]: msg }));
      onError(`Upload failed: ${field}`);
    } finally {
      setUploadingField("");
      setOptimisingField("");
    }
  };

  const docTheme = useTheme();
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg mb-1" style={{ color: docTheme.text }}>Document Upload</h3>
      <p className="text-sm mb-4" style={{ color: docTheme.textMuted }}>
        Upload clear photos of your documents. All 4 are required for KYC verification.
      </p>
      <RegisterStepDocuments
        vehiclePhoto={makeDoc("vehiclePhoto")}
        setVehiclePhoto={d => onChange("vehiclePhoto", d.url)}
        cnicPhoto={makeDoc("cnicDocUrl")}
        setCnicPhoto={d => onChange("cnicDocUrl", d.url)}
        cnicBackPhoto={makeDoc("cnicBackDocUrl")}
        setCnicBackPhoto={d => onChange("cnicBackDocUrl", d.url)}
        licensePhoto={makeDoc("licenseDocUrl")}
        setLicensePhoto={d => onChange("licenseDocUrl", d.url)}
        handleFileUpload={handleFileUpload}
        uploadErrors={uploadErrors}
        lastFiles={lastFiles}
        optimisingField={optimisingField}
        uploadingField={uploadingField}
      />
    </div>
  );
}

/* ── Password strength helper ── */
function getPasswordStrength(pw: string): { level: number; label: string; color: string; width: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "#ef4444", width: "25%" };
  if (score <= 2) return { level: 2, label: "Fair", color: "#f97316", width: "50%" };
  if (score <= 3) return { level: 3, label: "Good", color: "#F0B90B", width: "75%" };
  return { level: 4, label: "Strong", color: "#10b981", width: "100%" };
}

/* ── Step 5: Password ──────────────────────────────────────────────── */
function PasswordStep({ data, onChange, onError }: StepComponentProps) {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pw = (data.password as string) ?? "";
  const confirmPw = (data.confirmPassword as string) ?? "";
  const strength = pw ? getPasswordStrength(pw) : null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-1" style={{ color: theme.text }}>{T("createPassword")}</h3>
      <p className="text-sm mb-4" style={{ color: theme.textMuted }}>{T("secureYourAccount")}</p>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("password")} *</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"}
            className="w-full h-12 px-4 pr-10 rounded-xl text-sm focus:outline-none transition-all"
            style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
            value={pw} onChange={e => { onChange("password", e.target.value); onError(""); }} placeholder="Min 8 characters" />
          <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: theme.textMuted }}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {/* Password strength meter */}
        {strength && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 4, background: theme.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: strength.width, background: strength.color, borderRadius: 4, transition: "all 0.3s" }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: strength.color, minWidth: 42, textAlign: "right" }}>
                {strength.label}
              </span>
            </div>
            <p style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>
              {strength.level < 3 ? "Add uppercase, numbers, or special characters to strengthen" : "Great password!"}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: theme.primary }}>{T("confirmPassword")} *</label>
        <div className="relative">
          <input type={showConfirm ? "text" : "password"}
            className="w-full h-12 px-4 pr-10 rounded-xl text-sm focus:outline-none transition-all"
            style={{
              background: theme.background,
              border: `1px solid ${confirmPw && pw !== confirmPw ? "#ef4444" : confirmPw && pw === confirmPw ? "#10b981" : theme.border}`,
              color: theme.text,
            }}
            value={confirmPw} onChange={e => { onChange("confirmPassword", e.target.value); onError(""); }} placeholder="Re-enter password" />
          <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: theme.textMuted }}>
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPw && pw !== confirmPw && (
          <p style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>Passwords do not match</p>
        )}
        {confirmPw && pw === confirmPw && (
          <p style={{ fontSize: 10, color: "#10b981", marginTop: 4 }}>✓ Passwords match</p>
        )}
      </div>

      <div className="rounded-xl p-3" style={{ background: theme.background, border: `1px solid ${theme.border}` }}>
        <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Min 8 chars with at least one letter and one number.
        </p>
      </div>
    </div>
  );
}

/* ── Step 6: Success ────────────────────────────────────────────────── */
function SuccessStep({ data }: StepComponentProps) {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const theme = useTheme();

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${theme.primary}1A`, border: `1px solid ${theme.primary}4D` }}>
        <Shield size={40} style={{ color: theme.primary }} />
      </div>
      <h3 className="font-bold text-2xl mb-3" style={{ color: theme.text }}>{T("registrationComplete")}</h3>
      <p className="text-sm leading-relaxed mb-6" style={{ color: theme.textMuted }}>{T("riderApprovalMsg")}</p>
      <div className="rounded-xl p-4 text-left space-y-2" style={{ background: theme.background, border: `1px solid ${theme.border}` }}>
        {[
          { label: "Registration submitted", done: true },
          { label: "Documents under review", done: false, pulse: true },
          { label: "Go online & accept rides", done: false, locked: true },
          { label: "Withdraw earnings", done: false, locked: true },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            {item.done ? (
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
            ) : item.locked ? (
              <Lock size={16} className="flex-shrink-0" style={{ color: theme.textMuted }} />
            ) : (
              <Clock size={16} className={`flex-shrink-0 ${item.pulse ? "animate-pulse" : ""}`} style={{ color: theme.primary }} />
            )}
            <span className={`text-xs font-medium ${item.done ? "text-green-400" : ""}`} style={!item.done ? { color: item.locked ? theme.textMuted : theme.primary } : undefined}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Wizard config ─────────────────────────────────────────────────────────── */
const DOCUMENTS_STEP: StepConfig = {
  id: "documents",
  title: "Documents",
  component: DocumentsStep,
  validate: (data) => {
    if (!String(data.vehiclePhoto   ?? "").trim()) return "Please upload your Vehicle Photo";
    if (!String(data.cnicDocUrl     ?? "").trim()) return "Please upload your CNIC (front side)";
    if (!String(data.cnicBackDocUrl ?? "").trim()) return "Please upload your CNIC (back side)";
    if (!String(data.licenseDocUrl  ?? "").trim()) return "Please upload your Driving License photo";
    return null;
  },
};

const BASE_STEPS: StepConfig[] = [
  {
    id: "phone",
    title: "Phone",
    component: PhoneInfoStep,
    validate: (data) => {
      if (!String(data.name ?? "").trim()) return "Full name is required";
      const phone = String(data.phone ?? "").trim();
      if (!phone) return "Phone number is required";
      if (!isValidPakistaniPhone(phone)) return "Enter a valid Pakistani mobile number (03XXXXXXXXX)";
      return null;
    },
  },
  {
    id: "otp",
    title: "Verify",
    component: OtpStep,
    validate: (data) => {
      const otp = String(data.otp ?? "").trim();
      if (otp.length !== 6) return "Please enter the 6-digit OTP sent to your phone";
      return null;
    },
  },
  {
    id: "vehicle",
    title: "Vehicle",
    component: VehicleStep,
    validate: (data) => {
      const cnic = String(data.cnic ?? "").trim();
      if (cnic && !isValidCnic(cnic)) return "CNIC must be in format XXXXX-XXXXXXX-X";
      if (!String(data.vehicleType ?? "").trim()) return "Please select a vehicle type";
      if (!String(data.drivingLicense ?? "").trim()) return "Driving license number is required";
      if (!String(data.vehicleRegistration ?? "").trim()) return "Vehicle registration number is required";
      return null;
    },
  },
  DOCUMENTS_STEP,
  { id: "success", title: "Done", component: SuccessStep },
];

const PASSWORD_STEP: StepConfig = {
  id: "password",
  title: "Password",
  component: PasswordStep,
  validate: (data) => {
    const pw = String(data.password ?? "");
    if (!pw) return "Password is required";
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    if (pw !== String(data.confirmPassword ?? "")) return "Passwords do not match";
    return null;
  },
};

export interface RegisterWizardProps {
  onDone?: () => void;
}

export function RegisterWizard({ onDone }: RegisterWizardProps) {
  const theme = useTheme();
  const { sendOtp } = useAuthOps();
  const [, navigate] = useLocation();
  const { config } = usePlatformConfig();
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const auth = useRiderAuthConfig();

  /* Insert password step before success when username/password login is enabled */
  const steps: StepConfig[] = auth.usernamePassword
    ? [BASE_STEPS[0], BASE_STEPS[1], BASE_STEPS[2], BASE_STEPS[3], PASSWORD_STEP, BASE_STEPS[4]]
    : BASE_STEPS;

  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const ts = parseInt(localStorage.getItem(DRAFT_TTL_KEY) ?? "0", 10);
      if (raw && Date.now() - ts > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_TTL_KEY);
        return {};
      }
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  /* Save draft on every change — exclude passwords and uploaded document URLs */
  const handleDataChange = useCallback((key: string, value: unknown) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value };
      const {
        password: _pw, confirmPassword: _cpw,
        cnic: _cnic,
        vehiclePhoto: _vp, cnicDocUrl: _cd, cnicBackDocUrl: _cbd, licenseDocUrl: _ld,
        ...safe
      } = next as Record<string, unknown>;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
      localStorage.setItem(DRAFT_TTL_KEY, Date.now().toString());
      return next;
    });
  }, []);

  /* ── OTP send handler ── */
  const handleOtpRequest = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const result = await sendOtp(phone);
    return { success: result.success, error: result.error };
  };

  /* ── Submit handler ── */
  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const [deviceMeta] = await Promise.all([
        Promise.race([captureDeviceMeta(), new Promise<undefined>(r => setTimeout(() => r(undefined), 2000))]),
      ]);

      /* Build the documents JSON — field names match what /rider/me parses */
      const documents = JSON.stringify({
        cnicDocUrl:     data.cnicDocUrl     || null,
        cnicBackDocUrl: data.cnicBackDocUrl || null,
        licenseDocUrl:  data.licenseDocUrl  || null,
      });

      const payload: Parameters<typeof api.registerRider>[0] = {
        name: data.name as string,
        phone: data.phone as string,
        username: data.username as string | undefined,
        cnic: data.cnic as string,
        vehicleType: data.vehicleType as string,
        vehicleRegistration: data.vehicleRegistration as string,
        drivingLicense: data.drivingLicense as string,
        vehiclePhoto: data.vehiclePhoto as string | undefined,
        documents,
        ...(data.otp ? { otp: data.otp as string } : {}),
        ...(deviceMeta ? { deviceMeta } : {}),
      };
      if (auth.usernamePassword && data.password) {
        payload.password = data.password as string;
      }
      const res = await api.registerRider(payload) as { token?: string; user?: unknown };
      localStorage.removeItem(DRAFT_KEY);
      return { success: true, data: res };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : T("registrationFailed") };
    }
  };

  const totalSteps = steps.length;

  const currentStepIndex = useMemo(() => {
    if ((draft.password as string)?.length > 0) return totalSteps - 1;
    if (draft.vehiclePhoto || draft.cnicDocUrl || draft.licenseDocUrl) return totalSteps >= 5 ? 3 : 2;
    if (draft.vehicleType) return 2;
    if (draft.otp || draft.phone) return 1;
    return 0;
  }, [draft, totalSteps]);

  return (
    <div style={{ minHeight: "100vh", background: theme.background }}>
      <div className="max-w-sm mx-auto px-5 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
          style={{ color: theme.textMuted }}
        >
          <ArrowLeft size={16} /> {T("backToLogin")}
        </button>

        {/* Step progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.primary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span style={{ fontSize: 11, color: theme.textMuted }}>
              {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}% complete
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: theme.border, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.4s ease",
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryDark})`,
              width: `${Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%`,
            }} />
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, transition: "all 0.3s",
                background: i <= currentStepIndex ? theme.primary : theme.border,
                color: i <= currentStepIndex ? theme.background : theme.textMuted,
                boxShadow: i === currentStepIndex ? `0 0 0 3px ${theme.primary}30` : "none",
              }}>
                {i < currentStepIndex ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : i + 1}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: "28px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div className="text-center mb-6">
            <h1 className="font-extrabold text-2xl mb-1" style={{ color: theme.text }}>
              {T("riderRegistration")}
            </h1>
          </div>

          <RegisterScreen
            role="rider"
            steps={steps}
            bare
            initialData={draft}
            onDataChange={handleDataChange}
            onOtpRequest={handleOtpRequest}
            onSubmit={handleSubmit}
            onDone={() => { onDone?.(); navigate("/"); }}
          />
        </div>
      </div>
    </div>
  );
}
