export enum CompanyStatus {
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo',
  BLOCKED = 'Bloqueado',
  CANCELLED = 'Cancelado',
  UNUSED = 'Não utilizado'
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  contactName: string;
  status: CompanyStatus;
  createdAt: string;
}

export enum InvoiceStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
  OVERDUE = 'Vencido'
}

export interface Invoice {
  id: string;
  companyId: string;
  companyName: string; // Denormalized for easier display
  competence: string; // Format: YYYY-MM
  dueDate: string; // Format: YYYY-MM-DD
  employeeCount: number;
  unitValue: number; // Defaults to 5.00
  totalValue: number;
  status: InvoiceStatus;
}

export interface DashboardStats {
  totalRevenue: number;
  pendingRevenue: number;
  activeCompanies: number;
  totalEmployees: number;
}