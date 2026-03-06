import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kpuopfhyclauvrihklac.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdW9wZmh5Y2xhdXZyaWhrbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjE2NDQsImV4cCI6MjA4ODMzNzY0NH0.4Fv0kQALJXLOQR1F3mEuZXj7GM5uDF_Czmwle-3y_ww'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
