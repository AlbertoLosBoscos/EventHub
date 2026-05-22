import { Request, Response } from 'express';
import {supabase} from '../../supabase'

const tablaTicket = 'BDTicket';

export const verTickets = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaTicket)
            .select('*')

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const verTicketsPorUsuario = async (req: Request, res: Response) => {
    const { usuarioID } = req.query;
    
    if (!usuarioID) {
        res.status(400).json({ error: 'Falta el ID del usuario' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaTicket)
            .select('*')
            .eq('usuarioID', usuarioID as string);

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const crearTicket = async (req: Request, res: Response) => {
    const {usuarioID, asientos, eventoID, fecha, duracion} = req.body;
    if(!usuarioID || !eventoID){
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        const { data: existente } = await supabase
            .from(tablaTicket)
            .select('id')
            .eq('usuarioID', usuarioID)
            .eq('eventoID', eventoID)
            .eq('confirmado', false)
            .maybeSingle();

        if (existente) {
            const { data: actualizado, error: errorActualizado } = await supabase
                .from(tablaTicket)
                .update({ asientos: asientos || '' })
                .eq('id', existente.id)
                .select()
                .single();

            if (errorActualizado) throw errorActualizado;
            res.status(201).json({ message: 'Ticket actualizado', data: actualizado });
            return;
        }

        const { data, error } = await supabase
            .from(tablaTicket)
            .insert({ 
                usuarioID, 
                asientos: asientos || '', 
                eventoID, 
                fecha, 
                duracion,
                confirmado: false })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Ticket creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const actualizarTicket = async (req: Request, res: Response) => {
    const { ticketID, asientos, confirmado } = req.body;
    
    if (!ticketID) {
        res.status(400).json({ error: 'Falta el ID del ticket' });
        return;
    }

    try {
        const updateData: any = {};
        if (asientos !== undefined) updateData.asientos = asientos;
        if (confirmado !== undefined) updateData.confirmado = confirmado;

        const { data, error } = await supabase
            .from(tablaTicket)
            .update(updateData)
            .eq('id', ticketID)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Ticket actualizado', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const obtenerTicketPorUsuarioYEvento = async (req: Request, res: Response) => {
    const { usuarioID, eventoID } = req.query;
    
    if (!usuarioID || !eventoID) {
        res.status(400).json({ error: 'Faltan datos requeridos' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaTicket)
            .select('*')
            .eq('usuarioID', usuarioID as string)
            .eq('eventoID', eventoID as string)
            .eq('confirmado', false)
            .maybeSingle();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const obtenerAsientosOcupados = async (req: Request, res: Response) => {
    const { eventoID } = req.query;
    
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaTicket)
            .select('asientos')
            .eq('eventoID', eventoID as string);

        if (error) throw error;

        const listaOcupados = data
            ? data
                .map((t: { asientos: string }) => t.asientos)
                .join(', ')
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s !== '')
            : [];

        res.json(listaOcupados);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const buscarTickets = async (req: Request, res: Response) => {
    const { ticketID, email } = req.query;

    try {
        let query = supabase.from(tablaTicket).select('*');

        if (ticketID) {
            query = query.eq('id', ticketID as string);
        }

        if (email) {
            const { data: usuarios } = await supabase
                .from('Auth_Users')
                .select('id')
                .eq('email', email as string);

            if (usuarios && usuarios.length > 0) {
                const ids = usuarios.map(u => u.id);
                query = query.in('usuarioID', ids);
            } else {
                res.json([]);
                return;
            }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const devolverEntradaCliente = async (req: Request, res: Response) => {
    const { ticketID } = req.body;
    if (!ticketID) {
        res.status(400).json({ error: 'Falta el ID del ticket' });
        return;
    }
    try {
        const { error } = await supabase
            .from(tablaTicket)
            .delete()
            .eq('id', ticketID);

        if (error) throw error;

        res.json({ message: 'Entrada devuelta con éxito' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const devolverEntradaEmpleado = async (req: Request, res: Response) => {
    const { ticketID, email } = req.body;
    if (!ticketID || !email) {
        res.status(400).json({ error: 'Faltan el ID del ticket o el email del cliente' });
        return;
    }
    try {
        const { data: ticket, error: findError } = await supabase
            .from(tablaTicket)
            .select('id, usuarioID')
            .eq('id', ticketID)
            .maybeSingle();

        if (findError) throw findError;
        if (!ticket) {
            res.status(404).json({ error: 'Ticket no encontrado' });
            return;
        }

        const { error } = await supabase
            .from(tablaTicket)
            .delete()
            .eq('id', ticketID);

        if (error) throw error;

        res.json({ message: 'Entrada devuelta por el empleado con éxito' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const eliminarTicket = async (req: Request, res: Response) => {
    try {
        const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: ticketsExpirados, error: findError } = await supabase
            .from(tablaTicket)
            .select('id')
            .eq('confirmado', false)
            .lt('created_at', cincoMinutosAtras);

        if (findError) throw findError;

        if (!ticketsExpirados || ticketsExpirados.length === 0) {
            if (req) {
                res.json({ message: 'No hay tickets expirados', eliminados: 0 });
            }
            return;
        }

        const ids = ticketsExpirados.map(t => t.id);

        const { error: deleteError } = await supabase
            .from(tablaTicket)
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        if (req) {
            res.json({ message: 'Tickets expirados eliminados', eliminados: ids.length });
        }
    } catch (error: any) {
        if (req) {
            res.status(500).json({ error: error.message });
        }
    }
}

export const eliminarTicketsExpiradosCron = async () => {
    try {
        const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: ticketsExpirados, error: findError } = await supabase
            .from(tablaTicket)
            .select('id')
            .eq('confirmado', false)
            .lt('created_at', cincoMinutosAtras);

        if (findError) throw findError;
        if (!ticketsExpirados || ticketsExpirados.length === 0) return;

        const ids = ticketsExpirados.map(t => t.id);

        const { error: deleteError } = await supabase
            .from(tablaTicket)
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        console.log(`[Cron] Eliminados ${ids.length} tickets expirados`);
    } catch (error: any) {
        console.error('[Cron] Error al eliminar tickets expirados:', error.message);
    }
}

