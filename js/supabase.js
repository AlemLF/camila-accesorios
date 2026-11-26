import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vqjyrhqoauivtfipckjv.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_aJmHHf8graj6BjdTHncItA_VYgd6Gs6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);