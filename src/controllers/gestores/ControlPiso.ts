import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaPiso = 'BDPiso';

export const verPisos = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaPiso)
            .select('*');
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearPiso = async (req: Request, res: Response) => {
    const { planta, anfiteatroID, sitioID } = req.body;
    if (planta === undefined || !anfiteatroID || !sitioID) {
        res.status(400).json({ error: 'Faltan campos requeridos: planta, anfiteatroID, sitioID' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaPiso)
            .insert({ planta, anfiteatroID, sitioID })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Piso creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};