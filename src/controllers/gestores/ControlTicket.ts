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