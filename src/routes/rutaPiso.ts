import { Router } from 'express';
import { verPisos, crearPiso, verPisosSinAnfiteatro } from '../controllers/gestores/ControlPiso';

const router = Router();

router.get('/mostrar', verPisos);
router.get('/sin-anfiteatro', verPisosSinAnfiteatro);
router.post('/crear', crearPiso);

export default router;