// modules/database/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL تنظیم نشده است (supabaseUrl is required).')
}

if (!supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY تنظیم نشده است (supabaseKey is required).')
}

// ساخت پل ارتباطی ما با دیتابیس!
export const supabase = createClient(supabaseUrl, supabaseKey)
