import { Router } from 'express';
import { verTickets, crearTicket, verTicketsPorUsuario, obtenerAsientosOcupados, actualizarTicket, obtenerTicketPorUsuarioYEvento } from '../controllers/gestores/ControlTicket';

const router = Router();

router.get('/mostrar', verTickets);
router.get('/por-usuario', verTicketsPorUsuario);
router.get('/asientos-ocupados', obtenerAsientosOcupados);
router.get('/por-usuario-y-evento', obtenerTicketPorUsuarioYEvento);
router.post('/crear', crearTicket);
router.put('/actualizar', actualizarTicket);

export default router;