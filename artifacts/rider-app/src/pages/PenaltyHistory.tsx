import { formatCurrency as _sharedFc } from "@workspace/api-zod";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, ArrowLeft, Info } from "lucide-react";
import { api } from "../lib/api";
import { usePlatformConfig, formatDateTz } from "../lib/useConfig";
import { useLanguage } from "../lib/useLanguage";
import { tDual } from "@workspace/i18n";
import { PullToRefresh } from "../components/PullToRefresh";
import { ErrorState } from "../components/ui/ErrorState";
import { Link } from "wouter";

type Penalty = {
  id: string;
  type: string;
  amount: string | number;
  reason: string | null;
  createdAt: string;
};

function penaltyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ignore:   "Ride Ignored",
    cancel:   "Order Cancelled",
    late:     "Late Delivery",
    conduct:  "Conduct Violation",
    fraud:    "Fraud Attempt",
  };
  return map[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function penaltyColor(type: string): string {
  const map: Record<string, string> = {
    ignore:  "bg-amber-50 text-amber-700 border-amber-200",
    cancel:  "bg-orange-50 text-orange-700 border-orange-200",
    late:    "bg-yellow-50 text-yellow-700 border-yellow-200",
    conduct: "bg-red-50 text-red-700 border-red-200",
    fraud:   "bg-red-100 text-red-800 border-red-300",
  };
  return map[type] ?? "bg-gray-50 text-gray-700 border-gray-200";
}

function penaltyIcon(type: string) {
  if (type === "conduct" || type === "fraud") return <AlertTriangle size={16} className="shrink-0" />;
  return <ShieldAlert size={16} className="shrink-0" />;
}

export default function PenaltyHistory() {
  const { config } = usePlatformConfig();
  const { language } = useLanguage();
  const T = (key: Parameters<typeof tDual>[0]) => tDual(key, language);
  const currency = config.platform?.currencySymbol ?? "Rs.";
  const tz = config.regional?.timezone ?? "Asia/Karachi";
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["rider-penalty-history"],
    queryFn: () => api.getPenaltyHistory(),
    refetchInterval: false,
  });

  const penalties: Penalty[] = data?.penalties ?? [];
  const totalDeducted = penalties.reduce((sum, p) => sum + parseFloat(String(p.amount) || "0"), 0);

  const handlePullRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["rider-penalty-history"] });
  }, [qc]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh} accentColor="#10B981">
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
          <Link href="/profile">
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Penalty History</h1>
            <p className="text-xs text-gray-500">Your penalty & deduction records</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Summary card */}
          {!isLoading && !isError && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Deducted</p>
                <p className="text-2xl font-bold text-red-600 mt-0.5">
                  {currency} {_sharedFc(String(totalDeducted), currency)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{penalties.length} record{penalties.length !== 1 ? "s" : ""}</p>
              </div>
              {penalties.length === 0 ? (
                <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <ShieldAlert size={28} className="text-red-400" />
                </div>
              )}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Penalties are deducted from your wallet for policy violations such as ignoring ride requests, cancelling orders, or conduct issues. Contact support if you believe a penalty was applied in error.
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/5 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/5 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <ErrorState
              title="Could not load penalty history"
              subtitle="Please pull down to retry."
              onRetry={() => refetch()}
            />
          )}

          {/* Empty */}
          {!isLoading && !isError && penalties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              <p className="text-lg font-semibold text-gray-800">No Penalties</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">Great job! You have a clean record with no penalties.</p>
            </div>
          )}

          {/* Penalty list */}
          {!isLoading && !isError && penalties.length > 0 && (
            <div className="space-y-2.5">
              {penalties.map(p => {
                const amt = parseFloat(String(p.amount) || "0");
                const color = penaltyColor(p.type);
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${color}`}>
                          {penaltyIcon(p.type)}
                          {penaltyTypeLabel(p.type)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-red-600">
                          − {currency} {_sharedFc(String(amt), currency)}
                        </p>
                      </div>
                    </div>

                    {p.reason && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{p.reason}</p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTz(p.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }, tz)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
