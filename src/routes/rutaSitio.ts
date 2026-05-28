import { Router } from 'express';
import { verSitios, crearSitio } from '../controllers/gestores/ControlSitio';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verSitios);
router.post('/crear', verificarToken, soloAdmin, crearSitio);

export default router;