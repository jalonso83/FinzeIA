import express from 'express';
import { chatWithZenio, getChatHistory } from '../controllers/zenio';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de Zenio (Asistente IA)
router.post('/chat', chatWithZenio);
router.get('/history', getChatHistory);

export default router; 