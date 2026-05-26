import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaAnfiteatro = 'BDAnfiteatro';

export const verAnfiteatros = async (req: Request, res: Response) => {
    try {
        const { pisoID } = req.query;
        let query = supabase.from(tablaAnfiteatro).select('*');
        if (pisoID) {
            query = query.eq('pisoID', pisoID as string);
        }
        const { data } = await query;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearAnfiteatro = async (req: Request, res: Response) => {
    const { precio, precioVips, filas, columnas, asientosVacios, asientosVips, pisoID } = req.body;

    if (!precio || !filas || !columnas || !pisoID) {
        res.status(400).json({ error: 'Faltan campos requeridos: precio, filas, columnas, pisoID' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaAnfiteatro)
            .insert({
                precio,
                precioVips: precioVips || null,
                filas,
                columnas,
                asientosVacios: asientosVacios || [],
                asientosVips: asientosVips || [],
                pisoID
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Anfiteatro creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};