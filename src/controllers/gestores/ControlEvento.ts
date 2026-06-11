import { Request, Response } from 'express';
import {supabase, supabaseAdmin} from '../../supabase'
import { transporter } from '../../mailer';

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

export const cancelarEvento = async (req: Request, res: Response) => {
    const { eventoID } = req.params;
    if (!eventoID) {
        res.status(400).json({ error: 'Falta el ID del evento' });
        return;
    }
    try {
        const { data: evento, error: errEvento } = await supabase
            .from(tablaEvento)
            .select('nombre, fecha')
            .eq('id', eventoID)
            .single();
        if (errEvento || !evento) {
            res.status(404).json({ error: 'Evento no encontrado' });
            return;
        }

        const { error: errUpdate } = await supabase
            .from(tablaEvento)
            .update({ estado: 'cancelado' })
            .eq('id', eventoID);
        if (errUpdate) throw errUpdate;

        const { data: tickets } = await supabase
            .from('BDTicket')
            .select('id, usuarioID')
            .eq('eventoID', eventoID)
            .neq('estado', 'cancelado');

        if (tickets && tickets.length > 0) {
            await supabase
                .from('BDTicket')
                .update({ estado: 'cancelado' })
                .eq('eventoID', eventoID)
                .neq('estado', 'cancelado');
        }

        const from = process.env.MAIL_FROM || 'noreply@eventhub.com';
        if (tickets && tickets.length > 0) {
            const userIds = [...new Set(tickets.map((t: any) => t.usuarioID))];
            for (const uid of userIds) {
                try {
                    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
                    const email = userData?.user?.email;
                    if (email) {
                        await transporter.sendMail({
                            from,
                            to: email,
                            subject: 'Evento cancelado - EventHub',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                                    <h2 style="color: #c62828;">Evento Cancelado</h2>
                                    <p>El evento <strong>${evento.nombre}</strong> ha sido cancelado.</p>
                                    <p>Se reembolsará el costo del ticket.</p>
                                    <hr>
                                    <p><strong>Evento:</strong> ${evento.nombre}</p>
                                    <p><strong>Fecha:</strong> ${evento.fecha ? new Date(evento.fecha).toLocaleString('es-ES') : '-'}</p>
                                    <hr>
                                    <p style="color: #666; font-size: 12px;">EventHub - Gestión de entradas</p>
                                </div>
                            `,
                        });
                        console.log(`Correo de cancelación enviado a ${email}`);
                    }
                } catch (mailErr: any) {
                    console.error(`Error al enviar correo a ${uid}:`, mailErr.message);
                }
            }
        }

        res.json({ message: 'Evento cancelado con éxito y notificaciones enviadas' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

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