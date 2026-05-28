import { Router } from 'express';
import { magicLink, registro, login, loginConGithub, loginConGoogle, loginLimiter, registroLimiter, listarUsuarios, actualizarRol, toggleBan } from '../controllers/Authentification';
import { verificarToken, soloAdmin } from '../middleware/auth';

const router = Router();

router.get('/login/github', loginConGithub); 
router.get('/login/google', loginConGoogle); 
router.post('/magic-link', magicLink);

router.post('/register', registroLimiter, registro);
router.post('/login', loginLimiter, login);

router.get('/usuarios', verificarToken, soloAdmin, listarUsuarios);
router.put('/usuarios/:id/rol', verificarToken, soloAdmin, actualizarRol);
router.put('/usuarios/:id/ban', verificarToken, soloAdmin, toggleBan);

export default router;