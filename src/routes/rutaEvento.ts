import { Router } from 'express';
import { verEventos, crearEvento, verDetalles, verEventosPorFecha } from '../controllers/gestores/ControlEvento';

const router = Router();

router.get('/mostrar', verEventos);
router.get('/detalles/:eventoID', verDetalles);
router.get('/por-fecha', verEventosPorFecha);
router.post('/crear', crearEvento); 

export default router;