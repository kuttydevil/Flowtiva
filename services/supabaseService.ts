
/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { firebaseService, whatsAppInstanceFromSupabase, whatsAppMessageFromSupabase } from './firebaseService';

export const supabase = firebaseService;
export const supabaseService = firebaseService;
export { whatsAppInstanceFromSupabase, whatsAppMessageFromSupabase };
export const MESSAGE_PAGE_SIZE = 50;
