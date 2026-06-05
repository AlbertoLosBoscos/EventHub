import { Request, Response } from 'express';
import { supabase } from '../../supabase';

const tablaZona = 'BDZona';

function parseZonaText(val: any): string[] {
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

export const verZonas = async (req: Request, res: Response) => {
    try {
        const { anfiteatroID } = req.params;
        if (!anfiteatroID) {
            res.status(400).json({ error: 'anfiteatroID requerido' });
            return;
        }
        const { data } = await supabase
            .from(tablaZona)
            .select('*')
            .eq('anfiteatroID', anfiteatroID)
            .maybeSingle();
        if (data) {
            data.asientosVips = parseZonaText(data.asientosVips);
            data.Zona1 = parseZonaText(data.Zona1);
            data.Zona2 = parseZonaText(data.Zona2);
            data.Zona3 = parseZonaText(data.Zona3);
            data.asientosDiscapacitados = parseZonaText(data.asientosDiscapacitados);
        }
        res.json(data || {});
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const upsertZonas = async (req: Request, res: Response) => {
    const { anfiteatroID, asientosVips, precioVips, Zona1, precioZona1, Zona2, precioZona2, Zona3, precioZona3, asientosDiscapacitados } = req.body;

    if (!anfiteatroID) {
        res.status(400).json({ error: 'anfiteatroID requerido' });
        return;
    }

    try {
        const { data: existente } = await supabase
            .from(tablaZona)
            .select('id')
            .eq('anfiteatroID', anfiteatroID)
            .maybeSingle();

        const stringify = (arr: any) => JSON.stringify(arr ?? []);
        const payload = {
            anfiteatroID,
            asientosVips: stringify(asientosVips),
            precioVips: precioVips ?? 0,
            Zona1: stringify(Zona1),
            precioZona1: precioZona1 ?? 0,
            Zona2: stringify(Zona2),
            precioZona2: precioZona2 ?? 0,
            Zona3: stringify(Zona3),
            precioZona3: precioZona3 ?? 0,
            asientosDiscapacitados: stringify(asientosDiscapacitados),
        };

        let data;
        if (existente) {
            const resUp = await supabase
                .from(tablaZona)
                .update(payload)
                .eq('id', existente.id)
                .select()
                .single();
            if (resUp.error) throw resUp.error;
            data = resUp.data;
        } else {
            const resIn = await supabase
                .from(tablaZona)
                .insert(payload)
                .select()
                .single();
            if (resIn.error) throw resIn.error;
            data = resIn.data;
        }

        res.json({ message: 'Zonas guardadas con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};