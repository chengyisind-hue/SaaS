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
  employeeCount: number; // Stored count for auto-billing
  notes?: string; // Internal CRM notes
  companyKey?: string; // API Integration Key
  integrationPassword?: string; // API Integration Password
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
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  pendingRevenue: number;
  activeCompanies: number;
  totalEmployees: number;
}

export interface SystemLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user?: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface AppSettings {
  unitPrice: number;
  dueDay: number;
  apiKey: string;
  theme: 'light' | 'dark';
  integrationUrl?: string; // New: External API URL
  integrationToken?: string; // New: External API Token
}