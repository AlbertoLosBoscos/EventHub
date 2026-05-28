import { Router } from 'express';
import multer from 'multer';
import { subirImagenEvento } from '../controllers/ControlImagenes';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/imagen-evento', verificarToken, soloAdmin, upload.single('imagen'), subirImagenEvento);

export default router;
