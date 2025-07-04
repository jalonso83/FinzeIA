import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tipos para las peticiones
interface CreateBudgetRequest {
  amount: number;
  month: number;
  year: number;
}

interface UpdateBudgetRequest {
  amount?: number;
  month?: number;
  year?: number;
}

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { year } = req.query;

    const where: any = { userId };
    if (year) where.year = parseInt(year as string);

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ budgets });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch budgets'
    });
  }
};

export const getBudgetById = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        userId
      },
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!budget) {
      return res.status(404).json({
        error: 'Budget not found',
        message: 'Budget does not exist or you do not have access to it'
      });
    }

    res.json({ budget });
  } catch (error) {
    console.error('Get budget by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch budget'
    });
  }
};

export const createBudget = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, month, year }: CreateBudgetRequest = req.body;

    // Validaciones
    if (!amount || !month || !year) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount, month, and year are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount must be greater than 0'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Month must be between 1 and 12'
      });
    }

    if (year < 2020 || year > 2030) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Year must be between 2020 and 2030'
      });
    }

    // Verificar si ya existe un presupuesto para ese mes y año
    const existingBudget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year
        }
      }
    });

    if (existingBudget) {
      return res.status(409).json({
        error: 'Budget already exists',
        message: 'A budget for this month and year already exists'
      });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        amount,
        month,
        year
      },
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      message: 'Budget created successfully',
      budget
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create budget'
    });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData: UpdateBudgetRequest = req.body;

    // Verificar que el presupuesto existe y pertenece al usuario
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingBudget) {
      return res.status(404).json({
        error: 'Budget not found',
        message: 'Budget does not exist or you do not have access to it'
      });
    }

    // Validaciones
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount must be greater than 0'
      });
    }

    if (updateData.month !== undefined && (updateData.month < 1 || updateData.month > 12)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Month must be between 1 and 12'
      });
    }

    if (updateData.year !== undefined && (updateData.year < 2020 || updateData.year > 2030)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Year must be between 2020 and 2030'
      });
    }

    // Si se está actualizando mes o año, verificar que no exista otro presupuesto
    if (updateData.month || updateData.year) {
      const newMonth = updateData.month || existingBudget.month;
      const newYear = updateData.year || existingBudget.year;

      const conflictingBudget = await prisma.budget.findFirst({
        where: {
          userId,
          month: newMonth,
          year: newYear,
          id: { not: id }
        }
      });

      if (conflictingBudget) {
        return res.status(409).json({
          error: 'Budget already exists',
          message: 'A budget for this month and year already exists'
        });
      }
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Budget updated successfully',
      budget
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update budget'
    });
  }
};

export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verificar que el presupuesto existe y pertenece al usuario
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingBudget) {
      return res.status(404).json({
        error: 'Budget not found',
        message: 'Budget does not exist or you do not have access to it'
      });
    }

    await prisma.budget.delete({
      where: { id }
    });

    res.json({
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete budget'
    });
  }
}; 