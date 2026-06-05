import { Router } from 'express';
import { crearPaymentIntent, getConfig, pagarEfectivo } from '../controllers/ControlPago';
import { verificarToken } from '../middleware/auth';

const router = Router();

router.get('/config', getConfig);
router.post('/crear-intent', verificarToken, crearPaymentIntent);
router.post('/pagar-efectivo', verificarToken, pagarEfectivo);

export default router;