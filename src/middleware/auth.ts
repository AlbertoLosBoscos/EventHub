import { Request, Response, NextFunction } from 'express';
import { supabaseUsuario, supabase } from '../supabase';

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

export const verificarToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const client = supabaseUsuario(token);
        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const { data: userData } = await supabase
            .from('Auth_Users')
            .select('rol')
            .eq('id', user.id)
            .maybeSingle();

        req.usuario = {
            id: user.id,
            email: user.email || '',
            rol: userData?.rol || 'client',
        };

        next();
    } catch (error) {
        return res.status(500).json({ error: 'Error al verificar token' });
    }
};

export const soloAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    }
    next();
};

export const soloEmpleado = (req: Request, res: Response, next: NextFunction) => {
    if (req.usuario?.rol !== 'admin' && req.usuario?.rol !== 'employee') {
        return res.status(403).json({ error: 'Acceso denegado: se requiere rol empleado o admin' });
    }
    next();
};
