import { Router } from 'express';
import { stripe } from '../stripe';

const router = Router();

router.post('/crear-intent', async (req, res) => {
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
});

router.get('/config', (req, res) => {
    res.json({ publicKey: process.env.STRIPE_PUBLISHABLE });
});

export default router;