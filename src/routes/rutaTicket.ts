import { Router } from 'express';
import { verTickets, crearTicket, verTicketsPorUsuario, obtenerAsientosOcupados, actualizarTicket, obtenerTicketPorUsuarioYEvento, devolverEntradaCliente, devolverEntradaEmpleado, eliminarTicket, buscarTickets } from '../controllers/gestores/ControlTicket';

const router = Router();

router.get('/mostrar', verTickets);
router.get('/por-usuario', verTicketsPorUsuario);
router.get('/asientos-ocupados', obtenerAsientosOcupados);
router.get('/por-usuario-y-evento', obtenerTicketPorUsuarioYEvento);
router.post('/crear', crearTicket);
router.put('/actualizar', actualizarTicket);
router.get('/buscar', buscarTickets);
router.post('/devolver-cliente', devolverEntradaCliente);
router.post('/devolver-empleado', devolverEntradaEmpleado);
router.post('/eliminar-expirados', eliminarTicket);

export default router;