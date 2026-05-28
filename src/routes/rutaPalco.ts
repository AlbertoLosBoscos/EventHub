import { Router } from 'express';
import { verPalcos, crearPalco } from '../controllers/gestores/ControlPalco';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verPalcos);
router.post('/crear', verificarToken, soloAdmin, crearPalco);

export default router;