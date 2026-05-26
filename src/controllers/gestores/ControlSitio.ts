import { Request, Response } from 'express';
import {supabase} from '../../supabase'

const tablaSitio = 'BDSitio';
const tablaTicket = 'BDTicket';

export const verSitios = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaSitio)
            .select('*')

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const crearSitio = async (req: Request, res: Response) => {
    const {nombre, aforo} = req.body;
    if (!nombre || !aforo) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaSitio)
            .insert({ 
                nombre, 
                aforo })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Sitio creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const aforoDisponible = async (req: Request, res: Response) => {
    const { sitioID } = req.params;
    try {
        
    } catch (error) {
        
    }
}