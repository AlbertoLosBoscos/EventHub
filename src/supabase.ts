import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_API_SHOP || '';

export const supabase = createClient(supabaseUrl, supabaseKey);


export const supabaseUsuario = (token?: string) => {
    if (!token) return createClient(supabaseUrl, supabaseKey); 
    
    return createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};
