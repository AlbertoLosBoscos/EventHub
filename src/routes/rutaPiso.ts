import { Router } from 'express';
import { verPisos, crearPiso } from '../controllers/gestores/ControlPiso';

const router = Router();

router.get('/mostrar', verPisos);
router.post('/crear', crearPiso);

export default router;