import { Request, Response } from 'express';
import { stripe } from '../../stripe';

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