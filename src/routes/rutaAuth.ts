import { Router } from 'express';
import { magicLink, registro, login, loginConGithub, loginConGoogle, loginLimiter, registroLimiter, listarUsuarios, actualizarRol, toggleBan } from '../controllers/Authentification';

const router = Router();

router.get('/login/github', loginConGithub); 
router.get('/login/google', loginConGoogle); 
router.post('/magic-link', magicLink);

router.post('/register', registroLimiter, registro);
router.post('/login', loginLimiter, login);

router.get('/usuarios', listarUsuarios);
router.put('/usuarios/:id/rol', actualizarRol);
router.put('/usuarios/:id/ban', toggleBan);

export default router;