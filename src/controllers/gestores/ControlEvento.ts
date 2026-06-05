import { Request, Response } from 'express';
import {supabase} from '../../supabase'

const tablaEvento = 'BDEventos';

const selectConSitio = '*, sitio:BDSitio(nombre, direccion, url_maps)';

export const verEventos = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaEvento)
            .select(selectConSitio)

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const crearEvento = async (req: Request, res: Response) => {
    const {nombre, descripcion, sitioID, fecha, compania, duracion, imagen} = req.body;
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
                duracion,
                imagen: imagen || null,
                estado: 'disponible' })
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
            .select(selectConSitio)
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

export const actualizarEvento = async (req: Request, res: Response) => {
    const { eventoID } = req.params;
    const { nombre, descripcion, sitioID, fecha, compania, duracion, imagen, estado } = req.body;
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }
    try {
        const updateData: any = { nombre, descripcion, sitioID, fecha, compania, duracion };
        if (imagen !== undefined) updateData.imagen = imagen;
        if (estado !== undefined) updateData.estado = estado;

        const { data, error } = await supabase
            .from(tablaEvento)
            .update(updateData)
            .eq('id', eventoID)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Evento actualizado con éxito', data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const actualizarEstadosEventosCron = async () => {
    try {
        const { data: eventos, error } = await supabase
            .from(tablaEvento)
            .select('id, fecha, duracion, estado')
            .neq('estado', 'cancelado');

        if (error) throw error;
        if (!eventos || eventos.length === 0) return;

        const ahora = new Date();
        const actualizaciones: { id: string; estado: string }[] = [];

        for (const evento of eventos) {
            const fechaEvento = new Date(evento.fecha);
            const finEvento = new Date(fechaEvento.getTime() + evento.duracion * 60 * 1000);
            const unaHoraAntes = new Date(fechaEvento.getTime() - 60 * 60 * 1000);

            let nuevoEstado: string;

            if (ahora >= finEvento) {
                nuevoEstado = 'terminado';
            } else if (ahora >= unaHoraAntes) {
                nuevoEstado = 'realizandose';
            } else {
                nuevoEstado = 'disponible';
            }

            if (evento.estado !== nuevoEstado) {
                actualizaciones.push({ id: evento.id, estado: nuevoEstado });
            }
        }

        for (const upd of actualizaciones) {
            await supabase
                .from(tablaEvento)
                .update({ estado: upd.estado })
                .eq('id', upd.id);
        }

        if (actualizaciones.length > 0) {
            console.log(`[Cron] Estados actualizados: ${actualizaciones.map(u => `${u.id.slice(0,8)}→${u.estado}`).join(', ')}`);
        }
    } catch (error: any) {
        console.error('[Cron] Error al actualizar estados:', error.message);
    }
}

export const eliminarEvento = async (req: Request, res: Response) => {
    const { eventoID } = req.params;
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }
    try {
        const { error } = await supabase
            .from(tablaEvento)
            .delete()
            .eq('id', eventoID);

        if (error) throw error;

        res.json({ message: 'Evento eliminado con éxito' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export const verEventosPorFecha = async (req: Request, res: Response) => {
    const { fechaInicio, fechaFin, estado } = req.query;
    
    if (!fechaInicio || !fechaFin) {
        res.status(400).json({ error: 'Faltan fechaInicio y fechaFin' });
        return;
    }

    try {
        let query = supabase
            .from(tablaEvento)
            .select(selectConSitio)
            .gte('fecha', fechaInicio as string)
            .lte('fecha', fechaFin as string + 'T23:59:59')
            .order('fecha', { ascending: true });

        if (estado) {
            query = query.eq('estado', estado as string);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}