import { Router } from 'express';
import { crearPaymentIntent, getConfig } from '../controllers/ControlPago';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/config', getConfig);
router.post('/crear-intent', verificarToken, crearPaymentIntent);

export default router;