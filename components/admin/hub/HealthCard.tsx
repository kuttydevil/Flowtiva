
// src/components/admin/hub/HealthCard.tsx
import React from "react";
import { useTranslation } from "../../../contexts/LanguageContext";

type HealthState = "normal" | "degraded" | "error" | "unknown";

export interface HealthCardProps {
  state: HealthState;
  lastCheckedAt?: string | null; // ISO timestamp
  uptimePercent?: number | null; // 0-100
  onRefresh?: () => void;
  className?: string;
  loading?: boolean;
}

const COLOR_MAP: Record<HealthState, { bg: string; text: string; ring: string; icon: string; dot: string }> = {
  normal: { bg: "bg-green-500/5", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/20", icon: "fill-green-500", dot: "bg-green-500" },
  degraded: { bg: "bg-yellow-500/5", text: "text-yellow-600 dark:text-yellow-400", ring: "ring-yellow-500/20", icon: "fill-yellow-500", dot: "bg-yellow-500" },
  error: { bg: "bg-red-500/5", text: "text-red-600 dark:text-red-400", ring: "ring-red-500/20", icon: "fill-red-500", dot: "bg-red-500" },
  unknown: { bg: "bg-slate-500/5", text: "text-slate-600 dark:text-slate-400", ring: "ring-slate-500/20", icon: "fill-slate-500", dot: "bg-slate-500" },
};

function Icon({ state }: { state: HealthState }) {
  const token = COLOR_MAP[state || "unknown"];
  return (
    <div className="relative">
        <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="10" className={`${token.icon} opacity-20`} />
            <circle cx="12" cy="12" r="4" className={token.icon} />
        </svg>
        <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${token.dot}`} />
    </div>
  );
}

export default function HealthCard({
  state,
  lastCheckedAt,
  uptimePercent,
  onRefresh,
  className = "",
  loading = false,
}: HealthCardProps) {
  const { t } = useTranslation();
  const token = COLOR_MAP[state || "unknown"];
  const lastChecked = lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—";
  
  // Translation for state
  const stateLabel = t(`hub.healthCard.states.${state || "unknown"}`);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-[24px] p-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm ${className}`} role="status" aria-label="Loading health">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted" />
          <div className="flex-1">
            <div className="h-5 bg-muted rounded-full w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded-full w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      className={`rounded-[24px] p-6 border border-border/50 shadow-sm backdrop-blur-md bg-card/50 relative overflow-hidden group ${className}`}
      aria-labelledby="ai-health-title"
      role="region"
    >
      {/* Subtle background glow */}
      <div className={`absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-700 ${token.dot}`} />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${token.bg} ${token.ring} ring-1 shadow-inner group-hover:scale-105 transition-transform duration-500`}>
            <Icon state={state} />
          </div>
          <div>
            <h3 id="ai-health-title" className="text-lg font-bold tracking-tight text-foreground">
              {t('hub.healthCard.title')}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${token.dot} animate-pulse`} />
                <p className="text-xs font-medium text-muted-foreground">{t('hub.healthCard.statusLabel')} <span className={`font-bold ${token.text}`}>{stateLabel}</span></p>
            </div>
          </div>
        </div>

        {onRefresh && (
            <button
                onClick={onRefresh}
                aria-label={t('hub.healthCard.refresh')}
                className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 group-hover:bg-muted/40 transition-colors">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('hub.healthCard.lastChecked')}</div>
          <div className="font-bold text-foreground text-sm">{lastChecked}</div>
        </div>
        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 group-hover:bg-muted/40 transition-colors">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('hub.healthCard.uptime')}</div>
          <div className="font-bold text-foreground text-sm">
            {typeof uptimePercent === "number" ? `${uptimePercent.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>
    </article>
  );
}
