import { Router } from 'express';
import { verAnfiteatros, crearAnfiteatro } from '../controllers/gestores/ControlAnfiteatro';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verAnfiteatros);
router.post('/crear', verificarToken, soloAdmin, crearAnfiteatro);

export default router;