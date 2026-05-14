import { Request, Response } from 'express';
import { supabase } from '../supabase'; 
import rateLimit from 'express-rate-limit';

const localhost = process.env.LOCAL_HOST || '';

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