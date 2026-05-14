import { Router } from 'express';
import { verTickets, crearTicket } from '../controllers/gestores/ControlTicket';

const router = Router();

router.get('/mostrar', verTickets);
router.post('/crear', crearTicket);

export default router;