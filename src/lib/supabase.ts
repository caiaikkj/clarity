import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://' + 'sznzrkebtjrykjwtaimn' + '.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_' + '-IxuNLiWgxYAlFHHxabDcw_WnxFI9yc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
