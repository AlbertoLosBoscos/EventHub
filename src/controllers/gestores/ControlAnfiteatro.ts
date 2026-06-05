import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaAnfiteatro = 'BDAnfiteatro';

function parseTextArray(val: any): string[] {
    if (Array.isArray(val)) return val;
    if (typeof val !== 'string') return [];
    try {
        let p = JSON.parse(val);
        if (Array.isArray(p)) return p;
        if (typeof p === 'string') {
            let p2 = JSON.parse(p);
            if (Array.isArray(p2)) return p2;
        }
    } catch {}
    return [];
}

export const verAnfiteatros = async (req: Request, res: Response) => {
    try {
        const { pisoID } = req.query;
        let query = supabase.from(tablaAnfiteatro).select('*');
        if (pisoID) {
            query = query.eq('pisoID', pisoID as string);
        }
        const { data } = await query;
        if (data) {
            const arr = Array.isArray(data) ? data : [data];
            arr.forEach((a: any) => {
                a.asientosVacios = parseTextArray(a.asientosVacios);
            });
        }
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearAnfiteatro = async (req: Request, res: Response) => {
    const { filas, columnas, asientosVacios, pisoID } = req.body;

    if (!filas || !columnas || !pisoID) {
        res.status(400).json({ error: 'Faltan campos requeridos: filas, columnas, pisoID' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaAnfiteatro)
            .insert({
                filas,
                columnas,
                asientosVacios: JSON.stringify(asientosVacios || []),
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