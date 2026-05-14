import { Router } from 'express';
import { magicLink, registro, login, loginConGithub, loginConGoogle, loginLimiter, registroLimiter } from '../controllers/Authentification';

const router = Router();

router.get('/login/github', loginConGithub); 
router.get('/login/google', loginConGoogle); 
router.post('/magic-link', magicLink);

router.post('/register', registroLimiter, registro);
router.post('/login', loginLimiter, login);

export default router;