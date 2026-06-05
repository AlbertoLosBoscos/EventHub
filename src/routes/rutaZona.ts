import { Router } from 'express';
import { verZonas, upsertZonas } from '../controllers/gestores/ControlZona';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/mostrar/:anfiteatroID', verZonas);
router.post('/upsert', verificarToken, soloAdmin, upsertZonas);

export default router;