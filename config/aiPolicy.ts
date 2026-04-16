/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// src/config/aiPolicy.ts
export interface AIPolicy {
  maxRetries: number;
  timeoutMs: number;      // milliseconds
  dailyCallLimit: number; // global daily cap per tenant (or global if tenant_id null)
  fallbackStrategy: 'staleCache' | 'errorMessage';
  alertCooldownMs: number; // throttle identical alerts
}

export const aiPolicy: AIPolicy = {
  maxRetries: 2,
  timeoutMs: 15000,      // 15s
  dailyCallLimit: 5000,
  fallbackStrategy: 'staleCache',
  alertCooldownMs: 10 * 60 * 1000, // 10 minutes
};
