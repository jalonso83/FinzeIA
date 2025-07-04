import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tipos para las peticiones
interface CreateTransactionRequest {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string;
  date?: string;
}

interface UpdateTransactionRequest {
  amount?: number;
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  description?: string;
  date?: string;
}

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '10', type, category, startDate, endDate } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = { userId };

    if (type) where.type = type;
    if (category) where.category = { contains: category as string, mode: 'insensitive' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          description: true,
          date: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transactions'
    });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction does not exist or you do not have access to it'
      });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transaction'
    });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, type, category, description, date }: CreateTransactionRequest = req.body;

    // Validaciones
    if (!amount || !type || !category) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount, type, and category are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount must be greater than 0'
      });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Type must be either INCOME or EXPENSE'
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        type,
        category,
        description,
        date: date ? new Date(date) : new Date()
      },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create transaction'
    });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData: UpdateTransactionRequest = req.body;

    // Verificar que la transacción existe y pertenece al usuario
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction does not exist or you do not have access to it'
      });
    }

    // Validaciones
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount must be greater than 0'
      });
    }

    if (updateData.type && !['INCOME', 'EXPENSE'].includes(updateData.type)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Type must be either INCOME or EXPENSE'
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined
      },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update transaction'
    });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verificar que la transacción existe y pertenece al usuario
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction does not exist or you do not have access to it'
      });
    }

    await prisma.transaction.delete({
      where: { id }
    });

    res.json({
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete transaction'
    });
  }
}; 