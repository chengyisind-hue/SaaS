import { Company, CompanyStatus, Invoice, InvoiceStatus } from './types';

export const UNIT_PRICE = 5.00;

export const INITIAL_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'TechSolutions Ltda',
    cnpj: '12.345.678/0001-90',
    contactName: 'Carlos Silva',
    status: CompanyStatus.ACTIVE,
    createdAt: '2023-01-15'
  },
  {
    id: '2',
    name: 'Padaria do João',
    cnpj: '98.765.432/0001-10',
    contactName: 'João Santos',
    status: CompanyStatus.ACTIVE,
    createdAt: '2023-03-10'
  },
  {
    id: '3',
    name: 'Logística Express',
    cnpj: '45.678.901/0001-23',
    contactName: 'Mariana Costa',
    status: CompanyStatus.BLOCKED,
    createdAt: '2023-06-20'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: '101',
    companyId: '1',
    companyName: 'TechSolutions Ltda',
    competence: '2023-10',
    dueDate: '2023-11-10',
    employeeCount: 45,
    unitValue: 5.00,
    totalValue: 225.00,
    status: InvoiceStatus.PAID
  },
  {
    id: '102',
    companyId: '2',
    companyName: 'Padaria do João',
    competence: '2023-10',
    dueDate: '2023-11-10',
    employeeCount: 12,
    unitValue: 5.00,
    totalValue: 60.00,
    status: InvoiceStatus.PAID
  },
  {
    id: '103',
    companyId: '1',
    companyName: 'TechSolutions Ltda',
    competence: '2023-11',
    dueDate: '2023-12-10',
    employeeCount: 48,
    unitValue: 5.00,
    totalValue: 240.00,
    status: InvoiceStatus.PENDING
  },
  {
    id: '104',
    companyId: '2',
    companyName: 'Padaria do João',
    competence: '2023-11',
    dueDate: '2023-12-10',
    employeeCount: 12,
    unitValue: 5.00,
    totalValue: 60.00,
    status: InvoiceStatus.OVERDUE
  },
  {
    id: '105',
    companyId: '3',
    companyName: 'Logística Express',
    competence: '2023-11',
    dueDate: '2023-12-10',
    employeeCount: 150,
    unitValue: 5.00,
    totalValue: 750.00,
    status: InvoiceStatus.PENDING
  }
];