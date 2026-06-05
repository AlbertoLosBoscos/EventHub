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
    const {nombre, aforo, direccion, url_maps} = req.body;
    if (!nombre || !aforo) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tablaSitio)
            .insert({ 
                nombre, 
                aforo,
                direccion: direccion || null,
                url_maps: url_maps || null })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Sitio creado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const actualizarSitio = async (req: Request, res: Response) => {
    const { sitioID } = req.params;
    const { nombre, aforo, direccion, url_maps } = req.body;
    if (!sitioID) {
        res.status(400).json({ error: 'Falta el ID del sitio' });
        return;
    }
    try {
        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (aforo !== undefined) updateData.aforo = aforo;
        if (direccion !== undefined) updateData.direccion = direccion;
        if (url_maps !== undefined) updateData.url_maps = url_maps;

        const { data, error } = await supabase
            .from(tablaSitio)
            .update(updateData)
            .eq('id', sitioID)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Sitio actualizado con éxito', data });
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