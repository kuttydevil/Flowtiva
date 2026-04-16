/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { aiPolicy } from '../config/aiPolicy';
import { supabase } from '../services/supabaseService';
import { geminiService } from '../services/geminiService';
// FIX: (line 80) Type 'string' is not assignable. Importing AIAlert to use its specific alert_type.
import { AgentDetails, Workflow, WhatsAppMessage, DashboardStats, WhatsAppInstance, AITelemetryLog, AIAlert } from '../types';

type AIContextType = {
    // Insights
    insights: string[];
    isLoadingInsights: boolean;
    fetchInsights: (stats: DashboardStats, instances: WhatsAppInstance[]) => void;
    
    // Prompt Generation
    generateSystemPrompt: (details: AgentDetails, useCase: 'business' | 'personal') => Promise<string>;
    isGeneratingPrompt: boolean;
    promptError: string | null;

    // Workflow Generation
    generateWorkflow: (prompt: string) => Promise<Partial<Workflow>>;
    isGeneratingWorkflow: boolean;
    workflowError: string | null;

    // Tag Generation
    generateTags: (messages: Pick<WhatsAppMessage, 'sender' | 'messageText'>[]) => Promise<string[]>;
    isGeneratingTags: boolean;
    tagsError: string | null;
    
    // Governance
    aiHealth: 'normal' | 'degraded' | 'error';
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiHealth, setAiHealth] = useState<'normal' | 'degraded' | 'error'>('normal');

  const telemetryWindow = useRef<AITelemetryLog[]>([]);
  const telemetryBuffer = useRef<AITelemetryLog[]>([]);
  const lastAlertTimestamps = useRef<Record<string, number>>({});
  const inFlight = useRef<Map<string, Promise<any>>>(new Map());

  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const [insights, setInsights] = useState<string[]>([]);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const cacheKey = (actionKey: string, tenantId?: string) => `ai_cache:${tenantId ?? 'global'}:${actionKey}`;
  const setCache = (key: string, data: any, ttlMs = 3600_000) => { try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ttlMs, data })); } catch {} };
  const getCache = (key: string, maxAgeMs = 3600_000) => { try { const r = localStorage.getItem(key); if (!r) return null; const p = JSON.parse(r); if (maxAgeMs === Infinity || (Date.now() - p.ts <= p.ttlMs && Date.now() - p.ts <= maxAgeMs)) return p.data; return null; } catch { return null; }};

  const analyzeTelemetry = useCallback((log: AITelemetryLog) => {
    const arr = telemetryWindow.current;
    const errorCount = arr.filter(l => l.status === 'error').length;
    const errorRate = arr.length ? errorCount / arr.length : 0;
    const avgLatency = arr.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / Math.max(1, arr.length);

    // FIX: Type 'string' is not assignable to type '"LATENCY_SPIKE" | "HIGH_ERROR_RATE"'. Using AIAlert['alert_type'] instead.
    const logAlert = (type: AIAlert['alert_type'], message: string, metadata: object) => {
        const last = lastAlertTimestamps.current[type] ?? 0;
        if (Date.now() - last > aiPolicy.alertCooldownMs) {
            lastAlertTimestamps.current[type] = Date.now();
            supabase.logAIAlert({ type, message, metadata });
        }
    };

    if (errorRate > 0.2) {
      setAiHealth('degraded');
      logAlert('HIGH_ERROR_RATE', `Error rate spiked to ${(errorRate*100).toFixed(1)}%`, { errorRate, avgLatency });
    } else if ((log.duration_ms ?? 0) > 10000 || avgLatency > 8000) {
      setAiHealth('degraded');
      logAlert('LATENCY_SPIKE', `Latency spike detected: ${log.action_key} ${log.duration_ms}ms`, { sample: log });
    } else {
      setAiHealth('normal');
    }
  }, []);

  const logTelemetry = useCallback((log: Omit<AITelemetryLog, 'timestamp'>) => {
    const fullLog: AITelemetryLog = { ...log, timestamp: Date.now() };
    telemetryWindow.current.push(fullLog);
    if (telemetryWindow.current.length > 50) telemetryWindow.current.shift();
    analyzeTelemetry(fullLog);
    telemetryBuffer.current.push(fullLog);
  }, [analyzeTelemetry]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const toFlush = telemetryBuffer.current.splice(0);
      if (toFlush.length === 0) return;
      try {
        const { error } = await supabase.client.from('ai_telemetry').insert(toFlush.map(t => ({
            action_key: t.action_key,
            status: t.status,
            latency_ms: t.duration_ms ?? null,
            error_message: t.error_message ?? null,
            payload: t.payload ?? null,
            created_at: new Date(t.timestamp).toISOString(),
            tenant_id: t.tenant_id
        })));
        if (error) {
          console.error('Telemetry flush error:', error);
        }
      } catch (err) { console.error('Telemetry flush error:', err); }
    }, 30000); // flush every 30s
    return () => clearInterval(interval);
  }, []);

  const executeWithPolicy = useCallback(async <TOutput = any>(
    actionKey: string,
    fetcher: (signal: AbortSignal) => Promise<TOutput>,
    opts: { ttlMs?: number; cacheKey?: string; setter: (loading: boolean) => void; errorSetter: (error: string | null) => void }
  ): Promise<TOutput> => {
    const { ttlMs = 3600_000, cacheKey: baseCacheKey, setter, errorSetter } = opts;
    
    const { data: { session } } = await supabase.client.auth.getSession();
    const tenantId = session?.user?.uid;
    
    const fullCacheKey = baseCacheKey ? cacheKey(baseCacheKey, tenantId) : undefined;
    setter(true); errorSetter(null);
    const dedupeKey = `${tenantId ?? 'g'}:${actionKey}:${baseCacheKey}`;
    if (inFlight.current.has(dedupeKey)) return inFlight.current.get(dedupeKey) as Promise<TOutput>;

    const doFetch = async () => {
      if (tenantId) {
        const { data: usageData } = await supabase.client.rpc('get_ai_usage', { p_tenant: tenantId }).maybeSingle();
        if (((usageData as any)?.calls ?? 0) >= aiPolicy.dailyCallLimit) {
            throw new Error('Daily AI call limit exceeded');
        }
      }
      if (fullCacheKey) { const cached = getCache(fullCacheKey, ttlMs); if (cached) { logTelemetry({ action_key: actionKey, status: 'cached', tenant_id: tenantId }); return cached as TOutput; } }

      let attempt = 0;
      const start = Date.now();
      while (attempt <= aiPolicy.maxRetries) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), aiPolicy.timeoutMs);
        try {
          const result = await fetcher(controller.signal);
          clearTimeout(timeout);
          if (tenantId) {
            await supabase.client.rpc('increment_ai_usage', { p_tenant_id: tenantId, p_increment: 1 });
          }
          if (fullCacheKey) setCache(fullCacheKey, result, ttlMs);
          logTelemetry({ action_key: actionKey, status: 'success', duration_ms: Date.now() - start, tenant_id: tenantId });
          return result;
        } catch (err: any) {
          clearTimeout(timeout);
          logTelemetry({ action_key: actionKey, status: 'error', duration_ms: Date.now() - start, error_message: err?.message ?? String(err), tenant_id: tenantId, payload: { attempt } });
          attempt++;
          if (attempt > aiPolicy.maxRetries) { if (aiPolicy.fallbackStrategy === 'staleCache' && fullCacheKey) { const stale = getCache(fullCacheKey, Infinity); if (stale) return stale as TOutput; } throw err; }
          await new Promise(res => setTimeout(res, 500 * attempt));
        }
      }
      throw new Error('AI action failed after retries');
    };

    const promise = doFetch();
    inFlight.current.set(dedupeKey, promise);
    try {
      return await promise;
    } catch (e: any) { errorSetter(e.message); throw e; } 
    finally { setter(false); inFlight.current.delete(dedupeKey); }
  }, [logTelemetry]);

  const fetchInsights = useCallback(async (stats: DashboardStats, instances: WhatsAppInstance[]) => {
    try {
        const result = await executeWithPolicy('getDashboardInsights', () => geminiService.getDashboardInsights(stats, instances), { cacheKey: 'insights_cache', setter: setIsLoadingInsights, errorSetter: () => {} });
        setInsights(result || ["Welcome to your dashboard! Connect a WhatsApp account to get started."]);
    } catch (e) { console.error(e); setInsights(["Welcome! Connect your WhatsApp account to get started."]); }
  }, [executeWithPolicy]);

  const generateSystemPrompt = useCallback((details: AgentDetails, useCase: 'business' | 'personal') => executeWithPolicy('generateSystemPrompt', () => geminiService.generateSystemPrompt(details, useCase), { setter: setIsGeneratingPrompt, errorSetter: setPromptError }), [executeWithPolicy]);
  const generateWorkflow = useCallback((prompt: string) => executeWithPolicy('generateWorkflow', () => geminiService.generateWorkflowFromPrompt(prompt), { setter: setIsGeneratingWorkflow, errorSetter: setWorkflowError }), [executeWithPolicy]);
  const generateTags = useCallback((messages: Pick<WhatsAppMessage, 'sender' | 'messageText'>[]) => executeWithPolicy('generateTags', () => geminiService.generateTagsForConversation(messages), { cacheKey: `tags_${JSON.stringify(messages.slice(-5).map(m => m.messageText))}`, setter: setIsGeneratingTags, errorSetter: setTagsError }), [executeWithPolicy]);

  const value: AIContextType = { insights, isLoadingInsights, fetchInsights, generateSystemPrompt, isGeneratingPrompt, promptError, generateWorkflow, isGeneratingWorkflow, workflowError, generateTags, isGeneratingTags, tagsError, aiHealth };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
