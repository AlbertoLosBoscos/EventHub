import { Request, Response } from 'express';
import { supabase } from '../supabase'; 
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const localhost = process.env.LOCAL_HOST || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_API_EVENTHUB || '';

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { mensaje: "Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos." },
    standardHeaders: true, 
    legacyHeaders: false,
});

export const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 2,
    message: { mensaje: "Límite de creación de cuentas excedido. Inténtalo más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const registro = async (req: Request, res: Response) => {
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password?.toString().trim();

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ 
            error: "Email inválido o contraseña demasiado corta (mínimo 6 caracteres)" 
        });
    }

    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return res.status(400).json({ error: error.message });
        res.status(201).json({ message: 'Usuario registrado', data });
        
    } catch (error: any) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password?.toString().trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return res.status(401).json({ mensaje: error.message });
    }

    const userId = data.user.id;
    
    const { data: roleData } = await supabase
        .from('Auth_Users')
        .select('rol')
        .eq('id', userId)
        .maybeSingle();

    res.json({
        ...data,
        role: roleData?.rol || 'client' 
    }); 
};

export const loginConGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${localhost}/api/auth/callback` 
    }
  });

  if (error) {
    console.error("Error al iniciar sesión:", error.message);
  }
};

export const loginConGithub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${localhost}/api/auth/callback` 
    }
  });

  if (error) console.error("Error en GitHub login:", error.message);
};

export const magicLink = async (req: Request, res: Response) => {
    const email = req.body.email?.toString().trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: `${localhost}/api/auth/callback`,
        },
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ mensaje: "¡Enlace enviado! Revisa tu correo." });
};

export const listarUsuarios = async (req: Request, res: Response) => {
    try {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: customData } = await supabase
            .from('Auth_Users')
            .select('*');

        const customMap = new Map();
        (customData || []).forEach(u => customMap.set(u.id, u));

        const usuarios = (authUsers.users || []).map(u => {
            const custom = customMap.get(u.id) || {};
            return {
                id: u.id,
                email: u.email,
                created_at: u.created_at,
                rol: custom.rol || 'client',
                baneado: custom.baneado || false
            };
        });

        res.json(usuarios);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const actualizarRol = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rol } = req.body;
    if (!rol || !['client', 'employee', 'admin'].includes(rol)) {
        res.status(400).json({ error: 'Rol inválido' });
        return;
    }
    try {
        const { data, error } = await supabase
            .from('Auth_Users')
            .upsert({ id, rol }, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        res.json({ message: 'Rol actualizado', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const toggleBan = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data: current } = await supabase
            .from('Auth_Users')
            .select('baneado')
            .eq('id', id)
            .maybeSingle();

        const nuevoBaneado = !current?.baneado;
        const { data, error } = await supabase
            .from('Auth_Users')
            .upsert({ id, baneado: nuevoBaneado }, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        res.json({ message: nuevoBaneado ? 'Usuario baneado' : 'Usuario desbaneado', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};