import { Router } from 'express';
import { verEventos, crearEvento, verDetalles, verEventosPorFecha, actualizarEvento, eliminarEvento, cancelarEvento } from '../controllers/gestores/ControlEvento';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar', verEventos);
router.get('/detalles/:eventoID', verDetalles);
router.get('/por-fecha', verEventosPorFecha);
router.post('/crear', verificarToken, soloAdmin, crearEvento);
router.put('/actualizar/:eventoID', verificarToken, soloAdmin, actualizarEvento);
router.delete('/eliminar/:eventoID', verificarToken, soloAdmin, eliminarEvento);
router.put('/cancelar/:eventoID', verificarToken, soloAdmin, cancelarEvento);

export default router;