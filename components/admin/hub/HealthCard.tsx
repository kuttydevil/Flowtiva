
// src/components/admin/hub/HealthCard.tsx
import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "../../../contexts/LanguageContext";
import { cn } from "../../../lib/utils";

type HealthState = "normal" | "degraded" | "error" | "unknown";

export interface HealthCardProps {
  state: HealthState;
  lastCheckedAt?: string | null;
  uptimePercent?: number | null;
  onRefresh?: () => void;
  className?: string;
  loading?: boolean;
}

const COLOR_MAP: Record<HealthState, { bg: string; text: string; ring: string; icon: string; dot: string; glow: string }> = {
  normal: { bg: "bg-green-500/5", text: "text-green-500", ring: "ring-green-500/20", icon: "fill-green-500", dot: "bg-green-500", glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]" },
  degraded: { bg: "bg-yellow-500/5", text: "text-yellow-500", ring: "ring-yellow-500/20", icon: "fill-yellow-500", dot: "bg-yellow-500", glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]" },
  error: { bg: "bg-red-500/5", text: "text-red-500", ring: "ring-red-500/20", icon: "fill-red-500", dot: "bg-red-500", glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]" },
  unknown: { bg: "bg-slate-500/5", text: "text-slate-500", ring: "ring-slate-500/20", icon: "fill-slate-500", dot: "bg-slate-500", glow: "shadow-[0_0_20px_rgba(100,116,139,0.3)]" },
};

function StatusIcon({ state }: { state: HealthState }) {
  const token = COLOR_MAP[state || "unknown"];
  return (
    <div className="relative">
        <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="10" className={cn(token.icon, "opacity-20")} />
            <motion.circle 
                initial={{ r: 0 }}
                animate={{ r: 4 }}
                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                cx="12" cy="12" className={token.icon} 
            />
        </svg>
        <motion.div 
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("absolute inset-0 rounded-full", token.dot)} 
        />
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
  
  const stateLabel = t(`hub.healthCard.states.${state || "unknown"}`);

  if (loading) {
    return (
      <div className={cn("animate-pulse rounded-[32px] p-6 bg-card/50 border border-border/50", className)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded-full w-1/2" />
            <div className="h-3 bg-muted rounded-full w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className={cn(
        "rounded-[32px] p-8 border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl relative overflow-hidden group transition-all duration-500 relative z-0",
        className
      )}
    >
      {/* Dynamic Background Glow */}
      <div className={cn(
          "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000",
          token.dot
      )} />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-5">
          <div className={cn(
              "p-4 rounded-2xl ring-1 transition-all duration-500",
              token.bg, token.ring, token.glow,
              "group-hover:scale-105"
          )}>
            <StatusIcon state={state} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground/90">
              {t('hub.healthCard.title')}
            </h3>
            <div className="flex items-center gap-2 mt-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", token.dot, "animate-pulse")} />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    {stateLabel}
                </p>
            </div>
          </div>
        </div>

        {onRefresh && (
            <button
                onClick={onRefresh}
                className="p-3 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 group/btn shadow-inner"
            >
                <motion.svg 
                    whileHover={{ rotate: 180 }}
                    transition={{ type: "spring", damping: 12 }}
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </motion.svg>
            </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-muted/20 p-5 rounded-3xl border border-white/5 group-hover:bg-muted/30 transition-all duration-300">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-2">{t('hub.healthCard.lastChecked')}</div>
          <div className="font-bold text-foreground/80 tabular-nums">{lastChecked}</div>
        </div>
        <div className="bg-muted/20 p-5 rounded-3xl border border-white/5 group-hover:bg-muted/30 transition-all duration-300">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-2">{t('hub.healthCard.uptime')}</div>
          <div className="font-bold text-foreground/80 tabular-nums">
            {typeof uptimePercent === "number" ? `${uptimePercent.toFixed(1)}%` : "100.0%"}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
