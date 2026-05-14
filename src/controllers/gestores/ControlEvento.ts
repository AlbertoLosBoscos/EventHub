import { Request, Response } from 'express';
import {supabase} from '../../supabase'

const tablaEvento = 'BDEvento';

export const verEventos = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaEvento)
            .select('*')

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const crearEvento = async (req: Request, res: Response) => {
    const {nombre, descripcion, sitioID, fecha, compania, duracion} = req.body;
    if (!nombre  || !sitioID || !fecha || !duracion) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }
    try {
        const { data, error } = await supabase
            .from(tablaEvento)
            .insert({ 
                nombre, 
                descripcion, 
                sitioID, 
                fecha, 
                compania, 
                duracion })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Evento creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const verDetalles = async (req: Request, res: Response) => {
    const { eventoID } = req.params;
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }
    try {
        const { data } = await supabase
            .from(tablaEvento)
            .select('*')
            .eq('id', eventoID)
            .single();

        if (!data) {
            res.status(404).json({ error: 'Evento no encontrado' });
            return;
        }

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}