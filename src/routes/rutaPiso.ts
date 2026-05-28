import { Router } from 'express';
import { verPisos, crearPiso, verPisosSinAnfiteatro } from '../controllers/gestores/ControlPiso';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verPisos);
router.get('/sin-anfiteatro', verificarToken, soloAdmin, verPisosSinAnfiteatro);
router.post('/crear', verificarToken, soloAdmin, crearPiso);

export default router;