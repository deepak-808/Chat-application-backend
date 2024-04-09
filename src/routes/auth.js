import express from 'express';
import { handleLogin, handleNewUser, handleLogout } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/', handleLogin);

router.post('/register', handleNewUser);

router.get('/logout', handleLogout)


export default router;