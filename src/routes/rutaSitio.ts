import { Router } from 'express';
import { verSitios, crearSitio } from '../controllers/gestores/ControlSitio';

const router = Router();

router.get('/mostrar', verSitios);
router.post('/crear', crearSitio);

export default router;