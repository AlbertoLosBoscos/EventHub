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
    const {usuarioID, asientos, nEvento, fecha, duracion} = req.body;
    if(!usuarioID || !asientos){
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaTicket)
            .insert({ 
                usuarioID, 
                asientos, 
                nEvento, 
                fecha, 
                duracion })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Ticket creado con éxito', data });
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
            .eq('nEvento', eventoID as string);

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