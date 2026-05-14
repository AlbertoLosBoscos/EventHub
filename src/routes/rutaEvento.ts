import { Router } from 'express';
import { verEventos, crearEvento, verDetalles } from '../controllers/gestores/ControlEvento';

const router = Router();

router.get('/mostrar', verEventos);
router.get('/detalles/:eventoID', verDetalles);
router.post('/crear', crearEvento); 

export default router;