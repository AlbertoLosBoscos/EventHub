import { Router } from 'express';
import { crearPaymentIntent, getConfig } from '../controllers/ControlPago';

const router = Router();

router.post('/crear-intent', crearPaymentIntent);
router.get('/config', getConfig);

export default router;