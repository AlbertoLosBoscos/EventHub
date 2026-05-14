import { Router } from 'express';
import { verAnfiteatros, crearAnfiteatro } from '../controllers/gestores/ControlAnfiteatro';

const router = Router();

router.get('/mostrar', verAnfiteatros);
router.post('/crear', crearAnfiteatro);

export default router;