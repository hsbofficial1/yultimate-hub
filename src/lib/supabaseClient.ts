// Wrapper to relax Supabase typings until generated types are available
// Do NOT import this in backend code. Frontend only.
import { supabase as typedSupabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Cast to untyped client to avoid TS errors when types are not generated yet
export const supabase = typedSupabase as unknown as SupabaseClient<any>;
