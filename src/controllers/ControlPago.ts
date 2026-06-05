import { Request, Response } from 'express';
import { stripe } from '../stripe';
import { supabase } from '../supabase';

export const crearPaymentIntent = async (req: Request, res: Response) => {
    const { cantidad, asientos, eventoId, usuarioId } = req.body;

    if (!cantidad || !asientos) {
        res.status(400).json({ error: 'Faltan datos del pago' });
        return;
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(cantidad * 100),
            currency: 'eur',
            metadata: {
                asientos,
                eventoId: eventoId || '',
                usuarioId: usuarioId || ''
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getConfig = (req: Request, res: Response) => {
    res.json({ publicKey: process.env.STRIPE_PUBLISHABLE });
};

export const pagarEfectivo = async (req: Request, res: Response) => {
    const { ticketID, asientos, total, eventoID, usuarioID } = req.body;

    if (!ticketID || !eventoID || !usuarioID) {
        res.status(400).json({ error: 'Faltan datos requeridos' });
        return;
    }

    try {
        const { data: evento } = await supabase
            .from('BDEventos')
            .select('sitioID')
            .eq('id', eventoID)
            .single();

        if (!evento || !evento.sitioID) {
            res.status(400).json({ error: 'Evento no encontrado o sin sitio asignado' });
            return;
        }

        const { error: ticketError } = await supabase
            .from('BDTicket')
            .update({ asientos: asientos || '', confirmado: true })
            .eq('id', ticketID);

        if (ticketError) throw ticketError;

        const { data: sitio } = await supabase
            .from('BDSitio')
            .select('dineroCaja')
            .eq('id', evento.sitioID)
            .single();

        const cajaActual = sitio?.dineroCaja || 0;
        const nuevoSaldo = cajaActual + (total || 0);

        const { error: cajaError } = await supabase
            .from('BDSitio')
            .update({ dineroCaja: nuevoSaldo })
            .eq('id', evento.sitioID);

        if (cajaError) throw cajaError;

        res.json({ message: 'Pago en efectivo registrado con éxito', totalProcesado: total || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};