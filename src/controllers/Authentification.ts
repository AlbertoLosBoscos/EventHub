import { Request, Response } from 'express';
import { supabase } from '../supabase'; 
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

declare global {
    namespace Express {
        interface Request {
            usuario?: {
                id: string;
                email: string;
                rol: string;
            };
        }
    }
}

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
    
    const { data: userData } = await supabase
        .from('Auth_Users')
        .select('rol, baneado')
        .eq('id', userId)
        .maybeSingle();

    if (userData?.baneado) {
        return res.status(403).json({ mensaje: 'Tu cuenta ha sido suspendida. Contacta con el administrador.' });
    }

    res.json({
        ...data,
        role: userData?.rol || 'client' 
    }); 
};

export const loginConGoogle = async (req: Request, res: Response) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${req.protocol}://${req.get('host')}/api/auth/callback`
    }
  });

  if (error) {
    console.error("Error al iniciar sesión con Google:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (data?.url) {
    res.redirect(data.url);
  } else {
    res.status(500).json({ error: "No se pudo obtener la URL de autenticación" });
  }
};

export const loginConGithub = async (req: Request, res: Response) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${req.protocol}://${req.get('host')}/api/auth/callback`
    }
  });

  if (error) {
    console.error("Error al iniciar sesión con GitHub:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (data?.url) {
    res.redirect(data.url);
  } else {
    res.status(500).json({ error: "No se pudo obtener la URL de autenticación" });
  }
};

export const actualizarContrasena = async (req: Request, res: Response) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de recuperación requerido' });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUser = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || process.env.SUPABASE_API_EVENTHUB || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { error } = await supabaseUser.auth.updateUser({ password });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Contraseña actualizada correctamente' });
};

export const recuperarContrasena = async (req: Request, res: Response) => {
  const email = req.body.email?.toString().trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${req.protocol}://${req.get('host')}/recuperar-contrasena`,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Correo de recuperación enviado. Revisa tu bandeja de entrada.' });
};

export const magicLink = async (req: Request, res: Response) => {
    const email = req.body.email?.toString().trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: `${req.protocol}://${req.get('host')}/api/auth/callback`,
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

    if (id === req.usuario?.id) {
        res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
        return;
    }

    try {
        const { data: targetUser } = await supabase
            .from('Auth_Users')
            .select('rol')
            .eq('id', id)
            .maybeSingle();

        if (targetUser?.rol === 'admin') {
            res.status(403).json({ error: 'No puedes cambiar el rol de otro administrador' });
            return;
        }

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

    if (id === req.usuario?.id) {
        res.status(403).json({ error: 'No puedes banearte a ti mismo' });
        return;
    }

    try {
        const { data: targetUser } = await supabase
            .from('Auth_Users')
            .select('rol, baneado')
            .eq('id', id)
            .maybeSingle();

        if (targetUser?.rol === 'admin') {
            res.status(403).json({ error: 'No puedes banear a otro administrador' });
            return;
        }

        const nuevoBaneado = !targetUser?.baneado;
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
}