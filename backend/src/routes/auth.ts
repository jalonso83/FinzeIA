import express from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../controllers/auth';

const router = express.Router();

// Rutas de autenticación
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router; 