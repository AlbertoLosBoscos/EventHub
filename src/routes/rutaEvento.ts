import { Router } from 'express';
import { verEventos, crearEvento, verDetalles, verEventosPorFecha, actualizarEvento, eliminarEvento } from '../controllers/gestores/ControlEvento';

const router = Router();

router.get('/mostrar', verEventos);
router.get('/detalles/:eventoID', verDetalles);
router.get('/por-fecha', verEventosPorFecha);
router.post('/crear', crearEvento);
router.put('/actualizar/:eventoID', actualizarEvento);
router.delete('/eliminar/:eventoID', eliminarEvento);

export default router;