import { Request, Response } from 'express';
import {supabase, supabaseAdmin} from '../../supabase'

const tablaTicket = 'BDTicket';

async function enrichTickets(tickets: any[]) {
    if (!tickets || tickets.length === 0) return tickets;

    const eventosIds = [...new Set(tickets.map(t => t.eventoID).filter(Boolean))];

    const [eventosRes, usersRes] = await Promise.all([
        eventosIds.length > 0
            ? supabase.from('BDEventos').select('id, nombre').in('id', eventosIds)
            : { data: [] },
        supabaseAdmin.auth.admin.listUsers(),
    ]);

    const eventosMap = new Map((eventosRes.data || []).map((e: any) => [e.id, e.nombre]));
    const usuariosMap = new Map((usersRes.data?.users || []).map((u: any) => [u.id, u.email]));

    return tickets.map((t: any) => ({
        ...t,
        eventoNombre: eventosMap.get(t.eventoID) || null,
        usuarioEmail: usuariosMap.get(t.usuarioID) || null,
    }));
}

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

        const enriched = await enrichTickets(data);
        res.json(enriched);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const crearTicket = async (req: Request, res: Response) => {
    const {usuarioID, asientos, eventoID, fecha, duracion, planta} = req.body;
    if(!usuarioID || !eventoID){
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        let query = supabase
            .from(tablaTicket)
            .select('id')
            .eq('usuarioID', usuarioID)
            .eq('eventoID', eventoID)
            .eq('confirmado', false);
        if (planta !== undefined) {
            query = query.eq('planta', planta);
        }
        const { data: existente } = await query.maybeSingle();

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
                planta: planta ?? null,
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
    const { ticketID, asientos, confirmado, planta } = req.body;
    
    if (!ticketID) {
        res.status(400).json({ error: 'Falta el ID del ticket' });
        return;
    }

    try {
        const updateData: any = {};
        if (asientos !== undefined) updateData.asientos = asientos;
        if (confirmado !== undefined) updateData.confirmado = confirmado;
        if (planta !== undefined) updateData.planta = planta;

        const { data, error } = await supabase
            .from(tablaTicket)
            .update(updateData)
            .eq('id', ticketID)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            res.status(404).json({ error: 'Ticket no encontrado' });
            return;
        }

        res.json({ message: 'Ticket actualizado', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const obtenerTicketPorUsuarioYEvento = async (req: Request, res: Response) => {
    const { usuarioID, eventoID, planta } = req.query;
    
    if (!usuarioID || !eventoID) {
        res.status(400).json({ error: 'Faltan datos requeridos' });
        return;
    }

    try {
        let query = supabase
            .from(tablaTicket)
            .select('*')
            .eq('usuarioID', usuarioID as string)
            .eq('eventoID', eventoID as string)
            .eq('confirmado', false);
        if (planta !== undefined) {
            query = query.eq('planta', parseInt(planta as string));
        }
        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const obtenerAsientosOcupados = async (req: Request, res: Response) => {
    const { eventoID, usuarioID, planta } = req.query;
    
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }

    try {
        let query = supabase
            .from(tablaTicket)
            .select('asientos, usuarioID, confirmado')
            .eq('eventoID', eventoID as string);
        if (planta !== undefined) {
            query = query.eq('planta', parseInt(planta as string));
        }

        const { data, error } = await query;

        if (error) throw error;

        const parseSeats = (items: any[]) =>
            items
                .map((t: { asientos: string }) => t.asientos)
                .join(', ')
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s !== '');

        const allTickets = data || [];

        const tusCompras = usuarioID
            ? parseSeats(allTickets.filter(t => t.confirmado && t.usuarioID === usuarioID))
            : [];

        const ocupados = [...new Set(parseSeats(
            allTickets.filter(t => {
                if (t.confirmado && usuarioID && t.usuarioID === usuarioID) return false;
                if (!t.confirmado && usuarioID && t.usuarioID === usuarioID) return false;
                return true;
            })
        ))];

        res.json({ ocupados, tusCompras });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const buscarTickets = async (req: Request, res: Response) => {
    const { ticketID, email } = req.query;

    try {
        let usuarioIds: string[] | null = null;

        if (email) {
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
            const users = usersData?.users || [];
            const matched = users.filter((u: any) => u.email === email);
            if (matched.length === 0) {
                res.json([]);
                return;
            }
            usuarioIds = matched.map((u: any) => u.id);
        }

        let query = supabase.from(tablaTicket).select('*');

        if (usuarioIds) {
            query = query.in('usuarioID', usuarioIds);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        let resultados = data || [];

        if (ticketID) {
            const prefix = (ticketID as string).toLowerCase();
            resultados = resultados.filter((t: any) =>
                t.id && t.id.toLowerCase().startsWith(prefix)
            );
        }

        const enriched = await enrichTickets(resultados);
        res.json(enriched);
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
        const { data: ticket } = await supabase
            .from(tablaTicket)
            .select('fecha')
            .eq('id', ticketID)
            .maybeSingle();

        if (!ticket) {
            res.status(404).json({ error: 'Ticket no encontrado' });
            return;
        }

        const fechaEvento = new Date(ticket.fecha);
        const ahora = new Date();
        fechaEvento.setHours(0, 0, 0, 0);
        ahora.setHours(0, 0, 0, 0);

        if (fechaEvento <= ahora) {
            res.status(400).json({ error: 'No se puede devolver una entrada para un evento que ya ha ocurrido' });
            return;
        }

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
            .select('id, usuarioID, fecha')
            .eq('id', ticketID)
            .maybeSingle();

        if (findError) throw findError;
        if (!ticket) {
            res.status(404).json({ error: 'Ticket no encontrado' });
            return;
        }

        const fechaEvento = new Date(ticket.fecha);
        const ahora = new Date();
        fechaEvento.setHours(0, 0, 0, 0);
        ahora.setHours(0, 0, 0, 0);

        if (fechaEvento <= ahora) {
            res.status(400).json({ error: 'No se puede devolver una entrada para un evento que ya ha ocurrido' });
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

