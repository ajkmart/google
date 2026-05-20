/**
 * Vendor-app brand palette — orange on dark.
 *
 * Overrides the DEFAULT_THEMES.vendor defaults from @workspace/auth-react to
 * match the professional dark orange branding for the vendor dashboard.
 * Pass this object as the `theme` prop on ThemeProvider to apply:
 *
 *   <ThemeProvider role="vendor" theme={vendorTheme}>…</ThemeProvider>
 *
 *   import { useTheme } from "./lib/auth/ThemeContext";
 *   const theme = useTheme();  // { primary, background, text, … }
 */
import type { AuthTheme } from "@workspace/auth-react";

export const vendorTheme: Partial<AuthTheme> = {
  primary:            "#F97316",
  primaryDark:        "#EA580C",
  primaryLight:       "rgba(249,115,22,0.10)",
  background:         "#0F1117",
  text:               "#E2E8F0",
  textMuted:          "#6B7280",
  border:             "#252D3A",
  pendingOverlay:     "#131920",
  rejectedOverlay:    "#110D0B",
  maintenanceOverlay: "#131920",
  surface:            "#161B22",
};
