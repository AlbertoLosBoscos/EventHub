import { Router } from 'express';
import { verTickets, crearTicket, verTicketsPorUsuario, obtenerAsientosOcupados, actualizarTicket, obtenerTicketPorUsuarioYEvento, devolverEntradaCliente, devolverEntradaEmpleado, eliminarTicket, buscarTickets } from '../controllers/gestores/ControlTicket';
import { verificarToken, soloAdmin, soloEmpleado } from '../middleware/auth';

const router = Router();

router.get('/asientos-ocupados', obtenerAsientosOcupados);
router.post('/eliminar-expirados', eliminarTicket);

router.get('/por-usuario', verificarToken, verTicketsPorUsuario);
router.get('/por-usuario-y-evento', verificarToken, obtenerTicketPorUsuarioYEvento);
router.post('/crear', verificarToken, crearTicket);
router.put('/actualizar', verificarToken, actualizarTicket);
router.post('/devolver-cliente', verificarToken, devolverEntradaCliente);

router.get('/mostrar', verificarToken, soloAdmin, verTickets);
router.get('/buscar', verificarToken, soloEmpleado, buscarTickets);
router.post('/devolver-empleado', verificarToken, soloEmpleado, devolverEntradaEmpleado);

export default router;