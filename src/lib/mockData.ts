import { CompanyFinancials } from '../types/financial';
import { addMonths, subMonths } from 'date-fns';

const currentDate = new Date();
const startDate = subMonths(currentDate, 12);
const endDate = addMonths(currentDate, 24);

export const mockFinancials: CompanyFinancials = {
  cashBalance: 450000,
  startDate,
  endDate,
  revenueStreams: [
    {
      name: 'SaaS Subscriptions',
      growthRate: 0.15, // 15% annual growth
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 50000 * (1 + 0.15 / 12) ** i,
        category: 'SaaS',
        type: 'actual',
      })),
    },
    {
      name: 'Professional Services',
      seasonality: [0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1],
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 30000,
        category: 'Services',
        type: 'actual',
      })),
    },
  ],
  expenses: [
    {
      name: 'Engineering Team',
      isFixed: true,
      isRecurring: true,
      frequency: 'monthly',
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 120000,
        category: 'Engineering',
        type: 'actual',
      })),
    },
    {
      name: 'Sales Team',
      isFixed: true,
      isRecurring: true,
      frequency: 'monthly',
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 80000,
        category: 'Sales',
        type: 'actual',
      })),
    },
    {
      name: 'Office Space',
      isFixed: true,
      isRecurring: true,
      frequency: 'monthly',
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 15000,
        category: 'Facilities',
        type: 'actual',
      })),
    },
    {
      name: 'Marketing',
      isFixed: false,
      isRecurring: true,
      frequency: 'monthly',
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: addMonths(startDate, i),
        amount: 25000,
        category: 'Marketing',
        type: 'actual',
      })),
    },
    {
      name: 'Insurance',
      isFixed: true,
      isRecurring: true,
      frequency: 'yearly',
      entries: [
        {
          date: startDate,
          amount: 24000,
          category: 'Insurance',
          type: 'actual',
        },
      ],
    },
  ],
}; 