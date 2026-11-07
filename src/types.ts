export type DocumentType = 'FS' | 'FT' | 'FR' | 'NC'; // Fatura Simplificada, Fatura, Fatura-Recibo, Nota de Crédito

export type SaleType = 'dine_in' | 'takeaway' | 'delivery';

export type PaymentMethodType = 'dinheiro' | 'cartao' | 'mbway' | 'transferencia' | 'outro';

export type PaymentStatus = 'pago' | 'parcial' | 'pendente';

export type FiscalStatus = 'emitido' | 'pendente' | 'erro' | 'anulado';

export type Role = 'admin' | 'operador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pin?: string;
  active: boolean;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  nif: string;
  cae: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  shareCapital: string;
  commercialRegistry: string;
  logoUrl?: string;
}

export interface CertifiedBillingConfig {
  provider: 'vendus' | 'generic_at';
  providerName: string;
  apiKey: string; // Stored securely on server, masked on client
  hasApiKey: boolean;
  registerId: string; // Vendus Point of Sale Register ID
  seriesFS: string; // e.g. "FS2026"
  seriesFT: string; // e.g. "FT2026"
  seriesFR: string; // e.g. "FR2026"
  seriesNC: string; // e.g. "NC2026"
  environment: 'sandbox' | 'production';
  certifiedSoftwareNumber: string; // ex: "2230/AT"
  atcudPrefix: string;
  isActive: boolean;
  lastTestStatus?: 'success' | 'error' | 'untested';
  lastTestMessage?: string;
  lastTestDate?: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  action: 'emit_document' | 'credit_note' | 'test_connection' | 'send_email';
  documentType?: DocumentType;
  saleId?: string;
  documentNumber?: string;
  status: 'success' | 'error' | 'warning';
  statusCode?: number;
  requestSummary: string;
  responseSummary: string;
  errorMessage?: string;
  operatorName: string;
}

export interface IvaRate {
  code: 'NOR' | 'INT' | 'RED' | 'ISE';
  percentage: number;
  label: string;
  description: string;
}

export interface PriceHistoryItem {
  id: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number; // Preço com IVA incluído
  ivaRate: number; // 23, 13, 6, 0
  ivaCode: 'NOR' | 'INT' | 'RED' | 'ISE';
  isAccountantValidated: boolean; // Confirmação pelo contabilista
  accountantValidationDate?: string;
  available: boolean;
  internalCode?: string;
  imageUrl?: string;
  isFavorite: boolean;
  sortOrder?: number;
  priceHistory: PriceHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
  color?: string;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  nif: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: string;
  notes?: string;
  rgpdConsent: boolean;
  rgpdConsentDate?: string;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Preço unitário com IVA
  discountPercentage: number;
  discountAmount: number;
  total: number; // (unitPrice * quantity) - discountAmount
  ivaRate: number;
  ivaCode: 'NOR' | 'INT' | 'RED' | 'ISE';
  taxBase: number; // Incidência (sem IVA)
  ivaAmount: number; // Valor do imposto
  notes?: string;
}

export interface PaymentEntry {
  method: PaymentMethodType;
  amount: number;
  reference?: string; // ex: telefone MB Way ou nº de autorização TPA
  tendered?: number; // Para dinheiro (ex: entregou 20€)
  change?: number; // Troco (ex: 7.50€)
}

export interface FiscalDocument {
  id: string;
  saleId: string;
  documentType: DocumentType;
  documentNumber: string; // ex: "FS 2026/102"
  series: string;
  number: number;
  issuedAt: string;
  customerName: string;
  customerNif: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  totals: {
    netTotal: number; // Base tributável total
    grossTotal: number; // Total bruto
    taxTotal: number; // Total IVA
    discountTotal: number;
    finalTotal: number; // Total a pagar
    ivaBreakdown: {
      rate: number;
      code: string;
      base: number;
      amount: number;
    }[];
  };
  items: SaleItem[];
  payments: PaymentEntry[];
  atcud: string; // Código de validação AT retornado pelo software certificado
  qrCodeData: string; // Conteúdo oficial do código QR gerado pelo certificador
  signatureHash: string; // Primeiros e últimos 4 caracteres da assinatura criptográfica
  certifiedSoftwareNumber: string; // ex: "2230/AT"
  certifiedSoftwareName: string;
  pdfUrl?: string;
  isSecondCopy?: boolean;
  printCount: number;
  lastPrintedAt?: string;
  lastPrintedBy?: string;
  emailSentAt?: string;
  emailRecipient?: string;
  status: 'emitido' | 'anulado';
  rectifiedByNC?: string; // Se retificado por Nota de Crédito
  operatorName: string;
}

export interface Sale {
  id: string;
  receiptNumber: string; // Código operacional interno ex: "PED-2026-0042"
  saleType: SaleType;
  tableNumber?: string;
  orderReference?: string;
  shiftId: string;
  createdAt: string;
  operatorId: string;
  operatorName: string;
  customer?: {
    id?: string;
    name: string;
    nif: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: SaleItem[];
  totals: {
    netTotal: number;
    grossTotal: number;
    taxTotal: number;
    discountTotal: number;
    finalTotal: number;
    ivaBreakdown: {
      rate: number;
      code: string;
      base: number;
      amount: number;
    }[];
  };
  paymentStatus: PaymentStatus;
  payments: PaymentEntry[];
  fiscalStatus: FiscalStatus;
  fiscalDocumentId?: string;
  fiscalDocumentNumber?: string;
  fiscalPendingReason?: string;
  retryAttempts?: number;
  lastRetryAt?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'entrada' | 'saida' | 'sangria';
  amount: number;
  reason: string;
  operatorName: string;
  timestamp: string;
}

export interface CashShift {
  id: string;
  shiftNumber: number;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  openingAmount: number; // Fundo inicial de maneio
  closingCountedAmount?: number; // Dinheiro físico contado
  expectedCashAmount: number; // Calculado pelo sistema
  difference?: number; // Contado - Esperado
  closingNotes?: string;
  status: 'aberta' | 'fechada';
  movements: CashMovement[];
  totals: {
    salesCount: number;
    totalRevenue: number;
    dinheiro: number;
    cartao: number;
    mbway: number;
    outro: number;
    cashIn: number;
    cashOut: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'venda' | 'fatura' | 'caixa' | 'produto' | 'cliente' | 'sistema';
  details: string;
}
