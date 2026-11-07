import {
  CompanyInfo,
  CertifiedBillingConfig,
  Product,
  Category,
  Customer,
  CashShift,
  Sale,
  FiscalDocument,
  IntegrationLog,
  AuditLog,
  User,
} from '../types';
import { localStore } from './localStore';

// Flag to track whether the backend Express server (/api/*) is running or if we're in static/Netlify mode
let isServerAvailable: boolean | null = null;
let serverCheckPromise: Promise<boolean> | null = null;

async function checkServerAvailability(): Promise<boolean> {
  if (isServerAvailable !== null) return isServerAvailable;
  if (serverCheckPromise) return serverCheckPromise;

  serverCheckPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/status', { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        isServerAvailable = true;
        return true;
      }
    } catch {
      // Server unreachable, timeout or offline
    }
    isServerAvailable = false;
    return false;
  })();

  return serverCheckPromise;
}

/**
 * Helper to execute a fetch request with automatic fallback to localStore
 * if the server returns 404, non-JSON (like Netlify's index.html fallback), or throws a network error.
 */
async function callApi<T>(
  endpoint: string,
  options?: RequestInit,
  fallbackFn?: () => T | Promise<T>
): Promise<T> {
  const hasServer = await checkServerAvailability();

  if (!hasServer && fallbackFn) {
    return fallbackFn();
  }

  try {
    const res = await fetch(endpoint, options);
    const contentType = res.headers.get('content-type') || '';

    // If server responded with HTML (e.g., Netlify SPA 200/404 serving index.html) or 404/502
    if (!res.ok || !contentType.includes('application/json')) {
      isServerAvailable = false;
      if (fallbackFn) return fallbackFn();
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    isServerAvailable = false;
    if (fallbackFn) {
      return fallbackFn();
    }
    throw err;
  }
}

export const api = {
  // Check whether running in local/Netlify standalone mode
  isLocalMode() {
    return isServerAvailable === false;
  },

  // Status
  async getStatus() {
    return callApi('/api/status', undefined, () => localStore.getStatus());
  },

  // Company
  async getCompany(): Promise<CompanyInfo> {
    return callApi('/api/company', undefined, () => localStore.getCompany());
  },
  async updateCompany(data: Partial<CompanyInfo> & { operatorName?: string }): Promise<{ success: boolean; company: CompanyInfo }> {
    return callApi(
      '/api/company',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.updateCompany(data)
    );
  },

  // Certified Billing
  async getCertifiedBilling(): Promise<CertifiedBillingConfig> {
    return callApi('/api/certified-billing', undefined, () => localStore.getCertifiedBilling());
  },
  async updateCertifiedBilling(data: Partial<CertifiedBillingConfig> & { operatorName?: string }) {
    return callApi(
      '/api/certified-billing',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.updateCertifiedBilling(data)
    );
  },
  async testCertifiedBilling(operatorName?: string) {
    return callApi(
      '/api/certified-billing/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName }),
      },
      () => localStore.testCertifiedBilling(operatorName)
    );
  },
  async getIntegrationLogs(): Promise<IntegrationLog[]> {
    return callApi('/api/invoicing/logs', undefined, () => localStore.getIntegrationLogs());
  },

  // Products
  async getProducts(): Promise<Product[]> {
    return callApi('/api/products', undefined, () => localStore.getProducts());
  },
  async getCategories(): Promise<Category[]> {
    return callApi('/api/categories', undefined, () => localStore.getCategories());
  },
  async createProduct(data: Partial<Product> & { operatorName?: string }) {
    return callApi(
      '/api/products',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.createProduct(data)
    );
  },
  async updateProduct(id: string, data: Partial<Product> & { operatorName?: string; priceChangeReason?: string }) {
    return callApi(
      `/api/products/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.updateProduct(id, data)
    );
  },
  async validateAccountant(id: string, accountantName: string) {
    return callApi(
      `/api/products/${id}/validate-accountant`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountantName }),
      },
      () => localStore.validateAccountant(id, accountantName)
    );
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return callApi('/api/customers', undefined, () => localStore.getCustomers());
  },
  async saveCustomer(data: Partial<Customer> & { operatorName?: string }) {
    return callApi(
      '/api/customers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.saveCustomer(data)
    );
  },
  async anonymizeCustomer(id: string, operatorName?: string) {
    return callApi(
      `/api/customers/${id}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName }),
      },
      () => localStore.anonymizeCustomer(id, operatorName)
    );
  },

  // Shifts / Cash
  async getCurrentShift(): Promise<CashShift | null> {
    return callApi('/api/shifts/current', undefined, () => localStore.getCurrentShift());
  },
  async getShifts(): Promise<CashShift[]> {
    return callApi('/api/shifts', undefined, () => localStore.getShifts());
  },
  async openShift(openingAmount: number, operatorName?: string) {
    return callApi(
      '/api/shifts/open',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingAmount, operatorName }),
      },
      () => localStore.openShift(openingAmount, operatorName)
    );
  },
  async addShiftMovement(type: 'entrada' | 'saida' | 'sangria', amount: number, reason: string, operatorName?: string) {
    return callApi(
      '/api/shifts/movement',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount, reason, operatorName }),
      },
      () => localStore.addShiftMovement(type, amount, reason, operatorName)
    );
  },
  async closeShift(countedCash: number, closingNotes?: string, operatorName?: string) {
    return callApi(
      '/api/shifts/close',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedCash, closingNotes, operatorName }),
      },
      () => localStore.closeShift(countedCash, closingNotes, operatorName)
    );
  },

  // Sales
  async createSale(saleData: any): Promise<{
    success: boolean;
    sale?: Sale;
    fiscalDocument?: FiscalDocument;
    fiscalStatus?: string;
    pendingReason?: string;
    error?: string;
  }> {
    return callApi(
      '/api/sales',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      },
      () => localStore.createSale(saleData)
    );
  },
  async getSales(filters?: {
    startDate?: string;
    endDate?: string;
    nif?: string;
    fiscalStatus?: string;
    paymentMethod?: string;
    saleType?: string;
  }): Promise<Sale[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
    }
    return callApi(`/api/sales?${params.toString()}`, undefined, () => localStore.getSales(filters));
  },
  async getSale(id: string): Promise<Sale> {
    return callApi(`/api/sales/${id}`, undefined, () => {
      const sale = localStore.getSale(id);
      if (!sale) throw new Error('Venda não encontrada');
      return sale;
    });
  },

  // Invoicing & Documents
  async getFiscalDocuments(): Promise<FiscalDocument[]> {
    return callApi('/api/invoicing/documents', undefined, () => localStore.getFiscalDocuments());
  },
  async getFiscalDocument(id: string): Promise<FiscalDocument> {
    return callApi(`/api/invoicing/documents/${id}`, undefined, () => {
      const doc = localStore.getFiscalDocument(id);
      if (!doc) throw new Error('Documento fiscal não encontrado');
      return doc;
    });
  },
  async retryFiscalEmission(saleId: string, documentType = 'FS', operatorName?: string) {
    return callApi(
      `/api/invoicing/retry/${saleId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, operatorName }),
      },
      () => localStore.retryFiscalEmission(saleId, documentType, operatorName)
    );
  },
  async emitCreditNote(originalDocumentId: string, reason: string, operatorName?: string) {
    return callApi(
      '/api/invoicing/credit-note',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalDocumentId, reason, operatorName }),
      },
      () => localStore.emitCreditNote(originalDocumentId, reason, operatorName)
    );
  },
  async recordPrintDocument(id: string, operatorName?: string) {
    return callApi(
      `/api/invoicing/documents/${id}/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName }),
      },
      () => localStore.recordPrintDocument(id, operatorName)
    );
  },
  async emailDocument(id: string, recipientEmail: string, operatorName?: string) {
    return callApi(
      `/api/invoicing/documents/${id}/email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail, operatorName }),
      },
      () => localStore.emailDocument(id, recipientEmail, operatorName)
    );
  },
  async whatsappDocument(id: string, recipientPhone: string, operatorName?: string) {
    return callApi(
      `/api/invoicing/documents/${id}/whatsapp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone, operatorName }),
      },
      () => localStore.whatsappDocument(id, recipientPhone, operatorName)
    );
  },

  // Reports & Dashboard
  async getDashboardReport() {
    return callApi('/api/reports/dashboard', undefined, () => localStore.getDashboardReport());
  },
  async getDetailedReport(period: 'today' | 'week' | 'month' = 'today') {
    return callApi(`/api/reports/detailed?period=${period}`, undefined, () => localStore.getDetailedReport(period));
  },
  exportSalesCsv(period?: string) {
    const hasServer = isServerAvailable === true;
    if (hasServer) {
      window.location.href = `/api/reports/export-csv?period=${period || 'today'}`;
      return;
    }

    // Direct browser Blob download for Netlify/standalone mode
    const blob = localStore.exportSalesCsvBlob(period);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assx_tech_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Users & Audits
  async getUsers(): Promise<User[]> {
    return callApi('/api/users', undefined, () => localStore.getUsers());
  },
  async getAuditLogs(): Promise<AuditLog[]> {
    return callApi('/api/audit-logs', undefined, () => localStore.getAuditLogs());
  },
};
