import { Router } from 'express';
import { verSitios, crearSitio, actualizarSitio } from '../controllers/gestores/ControlSitio';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verSitios);
router.post('/crear', verificarToken, soloAdmin, crearSitio);
router.put('/actualizar/:sitioID', verificarToken, soloAdmin, actualizarSitio);

export default router;