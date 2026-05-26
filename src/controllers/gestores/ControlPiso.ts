import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaPiso = 'BDPiso';

export const verPisos = async (req: Request, res: Response) => {
    try {
        const { sitioID } = req.query;
        let query = supabase.from(tablaPiso).select('*');
        if (sitioID) {
            query = query.eq('sitioID', sitioID as string);
        }
        const { data } = await query;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const verPisosSinAnfiteatro = async (req: Request, res: Response) => {
    try {
        const { data: pisosConAnfi } = await supabase
            .from('BDAnfiteatro')
            .select('pisoID')
            .not('pisoID', 'is', null);

        const idsOcupados = (pisosConAnfi || []).map(p => p.pisoID).filter(Boolean);

        let query = supabase.from(tablaPiso).select('*');
        if (idsOcupados.length > 0) {
            query = query.not('id', 'in', `(${idsOcupados.map(id => `'${id}'`).join(',')})`);
        }
        const { data } = await query;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearPiso = async (req: Request, res: Response) => {
    const { planta, sitioID } = req.body;
    if (planta === undefined || !sitioID) {
        res.status(400).json({ error: 'Faltan campos requeridos: planta, sitioID' });
        return;
    }

    try {
        const { data: existente } = await supabase
            .from(tablaPiso)
            .select('id')
            .eq('sitioID', sitioID)
            .eq('planta', planta)
            .maybeSingle();

        if (existente) {
            res.status(409).json({ error: 'Este sitio ya tiene un piso con esa planta' });
            return;
        }

        const { data, error } = await supabase
            .from(tablaPiso)
            .insert({ planta, sitioID })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Piso creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};