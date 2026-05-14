import { Request, Response } from 'express';
import {supabase} from '../../supabase'

const tablaPalco = 'BDPalco';

export const verPalcos = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaPalco)
            .select('*')


        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearPalco = async (req: Request, res: Response) => {
    const {numero, asientos, precio} = req.body;
    if (!numero || !asientos || !precio) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try{
        const { data } = await supabase
            .from(tablaPalco)
            .insert({
                numero,
                asientos,
                precio
            })
            .select() 
            .single();

        res.status(201).json({ message: "palco creado correctamente", data });

    }catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}


