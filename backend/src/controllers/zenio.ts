import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tipos para las peticiones
interface ChatRequest {
  message: string;
  threadId?: string;
}

interface ChatResponse {
  message: string;
  threadId: string;
  messageId: string;
}

// Función para interactuar con OpenAI Assistant API
async function chatWithOpenAI(message: string, threadId?: string): Promise<ChatResponse> {
  try {
    const openai = require('openai');
    const client = new openai({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let currentThreadId = threadId;

    // Si no hay threadId, crear uno nuevo
    if (!currentThreadId) {
      const thread = await client.beta.threads.create();
      currentThreadId = thread.id;
    }

    // Agregar mensaje al thread
    await client.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message,
    });

    // Ejecutar el asistente
    const run = await client.beta.threads.runs.create(currentThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Esperar a que termine la ejecución
    let runStatus = await client.beta.threads.runs.retrieve(currentThreadId, run.id);
    
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(currentThreadId, run.id);
    }

    if (runStatus.status === "failed") {
      throw new Error("Assistant execution failed");
    }

    // Obtener la respuesta
    const messages = await client.beta.threads.messages.list(currentThreadId);
    const lastMessage = messages.data[0]; // El mensaje más reciente

    return {
      message: lastMessage.content[0].text.value,
      threadId: currentThreadId,
      messageId: lastMessage.id
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get response from Zenio');
  }
}

export const chatWithZenio = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message, threadId }: ChatRequest = req.body;

    // Validaciones
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Message is required'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Message is too long (max 1000 characters)'
      });
    }

    // Verificar que tenemos las credenciales de OpenAI
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI configuration is missing'
      });
    }

    // Obtener respuesta de Zenio
    const response = await chatWithOpenAI(message, threadId);

    // Guardar la conversación en la base de datos (opcional)
    // Aquí podrías implementar un sistema de historial de chat
    // Por ahora, solo retornamos la respuesta

    res.json({
      message: 'Chat successful',
      response: {
        message: response.message,
        threadId: response.threadId,
        messageId: response.messageId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Chat with Zenio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get response from Zenio'
    });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { threadId } = req.query;

    if (!threadId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Thread ID is required'
      });
    }

    // Verificar que tenemos las credenciales de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI configuration is missing'
      });
    }

    try {
      const openai = require('openai');
      const client = new openai({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Obtener mensajes del thread
      const messages = await client.beta.threads.messages.list(threadId as string);

      // Formatear los mensajes
      const formattedMessages = messages.data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content[0].text.value,
        timestamp: msg.created_at
      }));

      res.json({
        message: 'Chat history retrieved successfully',
        threadId,
        messages: formattedMessages
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      res.status(404).json({
        error: 'Thread not found',
        message: 'Chat history not found or thread does not exist'
      });
    }
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get chat history'
    });
  }
}; 