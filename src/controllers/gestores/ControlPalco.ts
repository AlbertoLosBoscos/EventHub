import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaPalco = 'BDPalco';

export const verPalcos = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaPalco)
            .select('*');
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearPalco = async (req: Request, res: Response) => {
    const { asientos, precio, pisoID } = req.body;
    if (!asientos || !precio || !pisoID) {
        res.status(400).json({ error: 'Faltan campos requeridos: asientos, precio, pisoID' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaPalco)
            .insert({ asientos, precio, pisoID })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Palco creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};