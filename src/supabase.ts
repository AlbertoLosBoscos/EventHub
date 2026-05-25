import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_API_EVENTHUB || '';
const supabaseServiceKey = process.env.SUPABASE_API_EVENTHUB || process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const supabaseUsuario = (token?: string) => {
    if (!token) return createClient(supabaseUrl, supabaseKey); 
    
    return createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};
