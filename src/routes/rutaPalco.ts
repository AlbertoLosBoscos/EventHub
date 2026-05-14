import { Router } from 'express';
import { verPalcos, crearPalco } from '../controllers/gestores/ControlPalco';

const router = Router();

router.get('/mostrar', verPalcos);
router.post('/crear', crearPalco);

export default router;