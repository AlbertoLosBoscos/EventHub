import { Router } from 'express';
import { verTickets, crearTicket, verTicketsPorUsuario, obtenerAsientosOcupados } from '../controllers/gestores/ControlTicket';

const router = Router();

router.get('/mostrar', verTickets);
router.get('/por-usuario', verTicketsPorUsuario);
router.get('/asientos-ocupados', obtenerAsientosOcupados);
router.post('/crear', crearTicket);

export default router;