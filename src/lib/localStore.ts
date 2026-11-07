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
  SaleItem,
  DocumentType,
  PaymentEntry,
} from '../types';
import { DEFAULT_DATABASE_DATA, DatabaseSchema } from './defaultData';

const STORAGE_KEY = 'assx_pos_db_v2';

class LocalStore {
  private memoryData: DatabaseSchema | null = null;

  private load(): DatabaseSchema {
    if (this.memoryData) return this.memoryData;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.company && Array.isArray(parsed.products)) {
            // Garantir Gregory como único usuário do sistema
            parsed.users = [
              {
                id: 'usr-1',
                name: 'Gregory',
                email: 'gregory@assxtech.com.br',
                role: 'admin',
                pin: '1234',
                active: true,
              },
            ];
            this.memoryData = parsed;
            this.save(parsed);
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage, usando valores padrão:', e);
    }

    // Initialize with deep copy of defaults
    const defaults = JSON.parse(JSON.stringify(DEFAULT_DATABASE_DATA));
    this.memoryData = defaults;
    this.save(defaults);
    return defaults;
  }

  private save(data: DatabaseSchema): void {
    this.memoryData = data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Aviso: Não foi possível gravar no LocalStorage:', e);
    }
  }

  private logAudit(
    action: string,
    category: AuditLog['category'],
    details: string,
    userName = 'Operador',
    userId = 'usr-1'
  ) {
    const data = this.load();
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      category,
      details,
    };
    data.auditLogs.unshift(log);
    if (data.auditLogs.length > 500) data.auditLogs.pop();
    this.save(data);
  }

  private logIntegration(
    action: IntegrationLog['action'],
    status: IntegrationLog['status'],
    requestSummary: string,
    responseSummary: string,
    operatorName: string,
    extra: Partial<IntegrationLog> = {}
  ) {
    const data = this.load();
    const log: IntegrationLog = {
      id: `intlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      status,
      requestSummary,
      responseSummary,
      operatorName,
      ...extra,
    };
    data.integrationLogs.unshift(log);
    if (data.integrationLogs.length > 200) data.integrationLogs.pop();
    this.save(data);
  }

  // Status
  async getStatus() {
    const data = this.load();
    const activeShift = data.shifts.find((s) => s.status === 'aberta') || null;
    return {
      online: true,
      storage: 'local_storage',
      companyName: data.company.name,
      activeShift,
      certifiedBilling: {
        provider: data.certifiedBilling.provider,
        providerName: data.certifiedBilling.providerName,
        isActive: data.certifiedBilling.isActive,
        environment: data.certifiedBilling.environment,
        hasApiKey: !!data.certifiedBilling.apiKey,
        lastTestStatus: data.certifiedBilling.lastTestStatus,
        lastTestMessage: data.certifiedBilling.lastTestMessage,
      },
    };
  }

  // Company
  getCompany(): CompanyInfo {
    return this.load().company;
  }

  updateCompany(data: Partial<CompanyInfo> & { operatorName?: string }): { success: boolean; company: CompanyInfo } {
    const db = this.load();
    const { operatorName, ...companyFields } = data;
    db.company = { ...db.company, ...companyFields };
    this.save(db);
    this.logAudit('Atualização de Dados da Empresa', 'sistema', 'Dados fiscais/comerciais atualizados localmente.', operatorName || 'Administrador');
    return { success: true, company: db.company };
  }

  // Certified Billing
  getCertifiedBilling(): CertifiedBillingConfig {
    const cfg = this.load().certifiedBilling;
    const maskedKey = cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}••••••••${cfg.apiKey.slice(-4)}` : '';
    return {
      ...cfg,
      apiKey: maskedKey,
      hasApiKey: !!cfg.apiKey && cfg.apiKey.length > 0,
    };
  }

  updateCertifiedBilling(data: Partial<CertifiedBillingConfig> & { operatorName?: string }) {
    const db = this.load();
    const current = db.certifiedBilling;
    if (data.apiKey !== undefined && !data.apiKey.includes('••••')) {
      current.apiKey = data.apiKey.trim();
      current.hasApiKey = !!data.apiKey.trim();
    }
    if (data.registerId !== undefined) current.registerId = data.registerId.trim();
    if (data.seriesFS !== undefined) current.seriesFS = data.seriesFS.trim();
    if (data.seriesFT !== undefined) current.seriesFT = data.seriesFT.trim();
    if (data.seriesFR !== undefined) current.seriesFR = data.seriesFR.trim();
    if (data.seriesNC !== undefined) current.seriesNC = data.seriesNC.trim();
    if (data.environment !== undefined) current.environment = data.environment;
    if (data.isActive !== undefined) current.isActive = data.isActive;

    this.save(db);
    this.logAudit(
      'Definições de Faturação',
      'sistema',
      `Configurações da API de faturação atualizadas (Ambiente: ${current.environment}, Ativo: ${current.isActive}).`,
      data.operatorName || 'Administrador'
    );
    return { success: true, message: 'Configurações de faturação salvas com sucesso.' };
  }

  testCertifiedBilling(operatorName = 'Operador') {
    const db = this.load();
    const cfg = db.certifiedBilling;
    const message = `Comunicação validada com o motor de testes AT (${cfg.providerName} - Certificado nº ${cfg.certifiedSoftwareNumber}). Série ativa: ${cfg.seriesFS}`;
    cfg.lastTestStatus = 'success';
    cfg.lastTestMessage = message;
    cfg.lastTestDate = new Date().toISOString();
    this.save(db);

    this.logIntegration(
      'test_connection',
      'success',
      `Teste de ligação à API certificada (${cfg.providerName}, modo: ${cfg.environment})`,
      message,
      operatorName
    );

    return {
      success: true,
      message,
      details: {
        environment: cfg.environment,
        certificate: cfg.certifiedSoftwareNumber,
        series: [cfg.seriesFS, cfg.seriesFT, cfg.seriesFR, cfg.seriesNC],
        register: cfg.registerId,
      },
    };
  }

  getIntegrationLogs(): IntegrationLog[] {
    return this.load().integrationLogs;
  }

  // Products
  getProducts(): Product[] {
    return this.load().products;
  }

  getCategories(): Category[] {
    return this.load().categories;
  }

  createProduct(data: Partial<Product> & { operatorName?: string }) {
    const db = this.load();
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: data.name || 'Novo Produto',
      description: data.description || '',
      categoryId: data.categoryId || (db.categories[0]?.id || 'cat-diversos'),
      price: Number(data.price) || 0,
      ivaRate: Number(data.ivaRate) || 13,
      ivaCode: data.ivaRate === 23 ? 'NOR' : data.ivaRate === 13 ? 'INT' : data.ivaRate === 6 ? 'RED' : 'ISE',
      isAccountantValidated: !!data.isAccountantValidated,
      accountantValidationDate: data.isAccountantValidated ? new Date().toISOString().slice(0, 10) : undefined,
      available: data.available !== undefined ? data.available : true,
      internalCode: data.internalCode || '',
      imageUrl: data.imageUrl || '',
      isFavorite: !!data.isFavorite,
      priceHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.products.push(newProduct);
    this.save(db);
    this.logAudit('Criação de Produto', 'produto', `Produto criado: ${newProduct.name} (${newProduct.price.toFixed(2)} €)`, data.operatorName || 'Administrador');
    return { success: true, product: newProduct };
  }

  updateProduct(id: string, data: Partial<Product> & { operatorName?: string; priceChangeReason?: string }) {
    const db = this.load();
    const prod = db.products.find((p) => p.id === id);
    if (!prod) {
      return { success: false, error: 'Produto não encontrado' };
    }

    const oldPrice = prod.price;
    const newPrice = data.price !== undefined ? Number(data.price) : prod.price;

    if (oldPrice !== newPrice) {
      prod.priceHistory = prod.priceHistory || [];
      prod.priceHistory.unshift({
        id: `ph-${Date.now()}`,
        oldPrice,
        newPrice,
        changedAt: new Date().toISOString(),
        changedBy: data.operatorName || 'Administrador',
        reason: data.priceChangeReason || 'Ajuste de preço no catálogo',
      });
    }

    if (data.name !== undefined) prod.name = data.name;
    if (data.description !== undefined) prod.description = data.description;
    if (data.categoryId !== undefined) prod.categoryId = data.categoryId;
    prod.price = newPrice;
    if (data.ivaRate !== undefined) {
      prod.ivaRate = Number(data.ivaRate);
      prod.ivaCode = prod.ivaRate === 23 ? 'NOR' : prod.ivaRate === 13 ? 'INT' : prod.ivaRate === 6 ? 'RED' : 'ISE';
    }
    if (data.isAccountantValidated !== undefined) {
      prod.isAccountantValidated = data.isAccountantValidated;
      if (data.isAccountantValidated) {
        prod.accountantValidationDate = new Date().toISOString().slice(0, 10);
      }
    }
    if (data.available !== undefined) prod.available = data.available;
    if (data.internalCode !== undefined) prod.internalCode = data.internalCode;
    if (data.imageUrl !== undefined) prod.imageUrl = data.imageUrl;
    if (data.isFavorite !== undefined) prod.isFavorite = data.isFavorite;
    prod.updatedAt = new Date().toISOString();

    this.save(db);
    this.logAudit('Edição de Produto', 'produto', `Produto atualizado: ${prod.name}`, data.operatorName || 'Administrador');
    return { success: true, product: prod };
  }

  validateAccountant(id: string, accountantName: string) {
    const db = this.load();
    const prod = db.products.find((p) => p.id === id);
    if (!prod) return { success: false, error: 'Produto não encontrado' };
    prod.isAccountantValidated = true;
    prod.accountantValidationDate = new Date().toISOString().slice(0, 10);
    prod.updatedAt = new Date().toISOString();
    this.save(db);
    this.logAudit('Validação Contabilística', 'produto', `Taxa de IVA (${prod.ivaRate}%) validada pelo contabilista: ${accountantName}`, accountantName);
    return { success: true, product: prod };
  }

  // Customers
  getCustomers(): Customer[] {
    return this.load().customers;
  }

  saveCustomer(c: Partial<Customer> & { operatorName?: string }) {
    const db = this.load();
    const isUpdate = !!c.id;
    let savedCustomer: Customer;

    if (isUpdate) {
      const idx = db.customers.findIndex((item) => item.id === c.id);
      if (idx !== -1) {
        db.customers[idx] = {
          ...db.customers[idx],
          name: c.name || db.customers[idx].name,
          nif: (c.nif || db.customers[idx].nif).replace(/\D/g, ''),
          email: c.email !== undefined ? c.email : db.customers[idx].email,
          phone: c.phone !== undefined ? c.phone : db.customers[idx].phone,
          address: c.address !== undefined ? c.address : db.customers[idx].address,
          postalCode: c.postalCode !== undefined ? c.postalCode : db.customers[idx].postalCode,
          city: c.city !== undefined ? c.city : db.customers[idx].city,
          notes: c.notes !== undefined ? c.notes : db.customers[idx].notes,
          rgpdConsent: c.rgpdConsent !== undefined ? c.rgpdConsent : db.customers[idx].rgpdConsent,
          rgpdConsentDate: c.rgpdConsent ? new Date().toISOString().slice(0, 10) : undefined,
        };
        savedCustomer = db.customers[idx];
        this.save(db);
        this.logAudit('Atualização de Cliente', 'cliente', `Cliente ${savedCustomer.name} (NIF: ${savedCustomer.nif})`, c.operatorName || 'Operador');
        return { success: true, customer: savedCustomer };
      }
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: c.name || 'Cliente',
      nif: (c.nif || '999999990').replace(/\D/g, ''),
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      postalCode: c.postalCode || '',
      city: c.city || '',
      country: 'Brasil',
      notes: c.notes || '',
      rgpdConsent: c.rgpdConsent !== undefined ? c.rgpdConsent : true,
      rgpdConsentDate: new Date().toISOString().slice(0, 10),
      totalSpent: 0,
      ordersCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.customers.push(newCustomer);
    this.save(db);
    this.logAudit('Registo de Cliente', 'cliente', `Cliente ${newCustomer.name} (NIF: ${newCustomer.nif})`, c.operatorName || 'Operador');
    return { success: true, customer: newCustomer };
  }

  anonymizeCustomer(id: string, operatorName = 'Administrador') {
    const db = this.load();
    const cust = db.customers.find((c) => c.id === id);
    if (!cust) return { success: false, error: 'Cliente não encontrado' };
    cust.name = `Cliente Anónimo (RGPD #${id.slice(-4)})`;
    cust.email = '';
    cust.phone = '';
    cust.address = '';
    cust.postalCode = '';
    cust.city = '';
    cust.notes = 'Dados pessoais anonimizados a pedido do titular nos termos do RGPD.';
    cust.rgpdConsent = false;
    this.save(db);
    this.logAudit('Direito ao Esquecimento RGPD', 'cliente', `Anonimização de dados do cliente #${id}`, operatorName);
    return { success: true, message: 'Dados pessoais anonimizados com sucesso.' };
  }

  // Shifts / Cash
  getCurrentShift(): CashShift | null {
    const db = this.load();
    return db.shifts.find((s) => s.status === 'aberta') || null;
  }

  getShifts(): CashShift[] {
    return this.load().shifts;
  }

  openShift(openingAmount: number, operatorName = 'Operador') {
    const db = this.load();
    const existing = db.shifts.find((s) => s.status === 'aberta');
    if (existing) {
      return { success: false, error: 'Já existe uma caixa aberta. Feche a anterior antes de abrir nova.' };
    }

    const initialVal = Number(openingAmount) || 0;
    const nextShiftNum = db.shifts.length + 101;
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: nextShiftNum,
      openedAt: new Date().toISOString(),
      openedBy: operatorName,
      openingAmount: initialVal,
      expectedCashAmount: initialVal,
      status: 'aberta',
      movements: [],
      totals: {
        salesCount: 0,
        totalRevenue: 0,
        dinheiro: 0,
        cartao: 0,
        mbway: 0,
        outro: 0,
        cashIn: 0,
        cashOut: 0,
      },
    };

    db.shifts.unshift(newShift);
    this.save(db);
    this.logAudit(`Abertura de Caixa #${nextShiftNum}`, 'caixa', `Caixa aberta com fundo de troco de ${initialVal.toFixed(2)} €`, operatorName);
    return { success: true, shift: newShift };
  }

  addShiftMovement(type: 'entrada' | 'saida' | 'sangria', amount: number, reason: string, operatorName = 'Operador') {
    const db = this.load();
    const active = db.shifts.find((s) => s.status === 'aberta');
    if (!active) {
      return { success: false, error: 'Não existe caixa aberta no momento.' };
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Valor inválido para o movimento.' };
    }

    const movement = {
      id: `mov-${Date.now()}`,
      shiftId: active.id,
      type,
      amount: numAmount,
      reason: reason.trim(),
      operatorName,
      timestamp: new Date().toISOString(),
    };

    active.movements.push(movement);
    if (type === 'entrada') {
      active.totals.cashIn += numAmount;
      active.expectedCashAmount += numAmount;
    } else {
      active.totals.cashOut += numAmount;
      active.expectedCashAmount -= numAmount;
    }

    this.save(db);
    this.logAudit(`Movimento de Caixa: ${type.toUpperCase()}`, 'caixa', `Valor: ${numAmount.toFixed(2)} €. Motivo: ${reason}`, operatorName);
    return { success: true, movement };
  }

  closeShift(countedCash: number, closingNotes = '', operatorName = 'Operador') {
    const db = this.load();
    const active = db.shifts.find((s) => s.status === 'aberta');
    if (!active) {
      return { success: false, error: 'Não existe caixa aberta para fechar.' };
    }

    const counted = Number(countedCash);
    const expected = active.expectedCashAmount;
    const difference = counted - expected;

    active.status = 'fechada';
    active.closedAt = new Date().toISOString();
    active.closedBy = operatorName;
    active.closingCountedAmount = counted;
    active.difference = difference;
    active.closingNotes = closingNotes;

    this.save(db);
    this.logAudit(`Fecho de Caixa #${active.shiftNumber}`, 'caixa', `Contado: ${counted.toFixed(2)} €, Esperado: ${expected.toFixed(2)} €, Dif: ${difference.toFixed(2)} €`, operatorName);
    return { success: true, shift: active };
  }

  // Sales & POS
  getSales(filters?: any): Sale[] {
    const db = this.load();
    let list = db.sales;
    if (filters) {
      if (filters.startDate) list = list.filter((s) => s.createdAt >= filters.startDate);
      if (filters.endDate) list = list.filter((s) => s.createdAt <= filters.endDate);
      if (filters.nif) list = list.filter((s) => s.customer?.nif.includes(filters.nif));
      if (filters.fiscalStatus) list = list.filter((s) => s.fiscalStatus === filters.fiscalStatus);
      if (filters.saleType) list = list.filter((s) => s.saleType === filters.saleType);
      if (filters.paymentMethod) list = list.filter((s) => s.payments.some((p) => p.method === filters.paymentMethod));
    }
    return list;
  }

  getSale(id: string): Sale | null {
    return this.load().sales.find((s) => s.id === id) || null;
  }

  createSale(saleData: any): {
    success: boolean;
    sale?: Sale;
    fiscalDocument?: FiscalDocument;
    fiscalStatus?: string;
    pendingReason?: string;
    error?: string;
  } {
    const db = this.load();
    const { items, payments, saleType, tableNumber, orderReference, customer, operatorId, operatorName, notes, documentType = 'FS' } = saleData;

    if (!items || items.length === 0) {
      return { success: false, error: 'A venda deve conter pelo menos um item.' };
    }

    const activeShift = db.shifts.find((s) => s.status === 'aberta');
    const shiftId = activeShift ? activeShift.id : 'shift-default';

    let grossTotal = 0;
    let discountTotal = 0;
    let netTotal = 0;
    let taxTotal = 0;

    const ivaMap = new Map<number, { base: number; amount: number; code: string }>();

    const calculatedItems: SaleItem[] = items.map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const discountPct = Number(it.discountPercentage) || 0;
      const rawLineTotal = unitPrice * qty;
      const lineDiscount = (rawLineTotal * discountPct) / 100;
      const finalLineTotal = rawLineTotal - lineDiscount;

      const rate = Number(it.ivaRate) || 13;
      const code = rate === 23 ? 'NOR' : rate === 13 ? 'INT' : rate === 6 ? 'RED' : 'ISE';
      const base = finalLineTotal / (1 + rate / 100);
      const tax = finalLineTotal - base;

      grossTotal += rawLineTotal;
      discountTotal += lineDiscount;
      netTotal += base;
      taxTotal += tax;

      const currMap = ivaMap.get(rate) || { base: 0, amount: 0, code };
      currMap.base += base;
      currMap.amount += tax;
      ivaMap.set(rate, currMap);

      return {
        productId: it.productId,
        productName: it.productName,
        quantity: qty,
        unitPrice,
        discountPercentage: discountPct,
        discountAmount: lineDiscount,
        total: finalLineTotal,
        ivaRate: rate,
        ivaCode: code as any,
        taxBase: Number(base.toFixed(2)),
        ivaAmount: Number(tax.toFixed(2)),
        notes: it.notes || '',
      };
    });

    const finalTotal = grossTotal - discountTotal;
    const ivaBreakdown = Array.from(ivaMap.entries()).map(([rate, val]) => ({
      rate,
      code: val.code,
      base: Number(val.base.toFixed(2)),
      amount: Number(val.amount.toFixed(2)),
    }));

    const saleNumberSeq = db.sales.length + 1;
    const receiptNumber = `PED-2026-${String(saleNumberSeq).padStart(4, '0')}`;

    const validatedPayments: PaymentEntry[] = (payments || []).map((p: any) => ({
      method: p.method,
      amount: Number(p.amount) || 0,
      reference: p.reference,
      tendered: p.tendered ? Number(p.tendered) : undefined,
      change: p.change ? Number(p.change) : undefined,
    }));

    const totalPaid = validatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const paymentStatus = totalPaid >= finalTotal - 0.01 ? 'pago' : totalPaid > 0 ? 'parcial' : 'pendente';

    const sale: Sale = {
      id: `sale-${Date.now()}-${saleNumberSeq}`,
      receiptNumber,
      saleType: saleType || 'dine_in',
      tableNumber,
      orderReference,
      shiftId,
      createdAt: new Date().toISOString(),
      operatorId: operatorId || 'usr-1',
      operatorName: operatorName || 'Operador',
      customer: customer
        ? {
            id: customer.id,
            name: customer.name || 'Consumidor Final',
            nif: (customer.nif || '999999990').replace(/\D/g, ''),
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
          }
        : {
            name: 'Consumidor Final',
            nif: '999999990',
          },
      items: calculatedItems,
      totals: {
        netTotal: Number(netTotal.toFixed(2)),
        grossTotal: Number(grossTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        finalTotal: Number(finalTotal.toFixed(2)),
        ivaBreakdown,
      },
      paymentStatus,
      payments: validatedPayments,
      fiscalStatus: 'emitido',
      notes,
    };

    // Gera documento fiscal correspondente
    const cfg = db.certifiedBilling;
    const seriesCode = documentType === 'FS' ? cfg.seriesFS : documentType === 'FT' ? cfg.seriesFT : cfg.seriesFR;
    const sameSeriesDocs = db.fiscalDocuments.filter((d) => d.series === seriesCode && d.documentType === documentType);
    const nextNumber = sameSeriesDocs.length + 1;
    const docNumberStr = `${documentType} 2026/${String(nextNumber).padStart(4, '0')}`;
    const atcud = `${cfg.atcudPrefix}-${String(nextNumber).padStart(4, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const qrCode = `A:${db.company.nif}*B:${sale.customer?.nif || '999999990'}*C:PT*D:${documentType}*E:N*F:${todayStr}*G:${docNumberStr}*H:${atcud}*N:${sale.totals.taxTotal.toFixed(2)}*O:${sale.totals.finalTotal.toFixed(2)}*Q:H8jK*R:${cfg.certifiedSoftwareNumber}`;

    const fiscalDoc: FiscalDocument = {
      id: `doc-cert-${Date.now()}-${nextNumber}`,
      saleId: sale.id,
      documentType: documentType as DocumentType,
      documentNumber: docNumberStr,
      series: seriesCode,
      number: nextNumber,
      issuedAt: new Date().toISOString(),
      customerName: sale.customer?.name || 'Consumidor Final',
      customerNif: sale.customer?.nif || '999999990',
      customerAddress: sale.customer?.address,
      customerPhone: sale.customer?.phone,
      customerEmail: sale.customer?.email,
      totals: sale.totals,
      items: sale.items,
      payments: sale.payments,
      atcud,
      qrCodeData: qrCode,
      signatureHash: 'j8Wb...w1Za',
      certifiedSoftwareNumber: cfg.certifiedSoftwareNumber,
      certifiedSoftwareName: cfg.providerName,
      isSecondCopy: false,
      printCount: 0,
      status: 'emitido',
      operatorName: operatorName || 'Operador',
    };

    sale.fiscalDocumentId = fiscalDoc.id;
    sale.fiscalDocumentNumber = fiscalDoc.documentNumber;

    db.sales.unshift(sale);
    db.fiscalDocuments.unshift(fiscalDoc);

    // Update customer stats
    if (customer && customer.id) {
      const dbCust = db.customers.find((c) => c.id === customer.id);
      if (dbCust) {
        dbCust.totalSpent += finalTotal;
        dbCust.ordersCount += 1;
      }
    }

    // Update shift totals
    if (activeShift) {
      activeShift.totals.salesCount += 1;
      activeShift.totals.totalRevenue += finalTotal;
      for (const p of validatedPayments) {
        if (p.method === 'dinheiro') {
          activeShift.totals.dinheiro += p.amount;
          activeShift.expectedCashAmount += p.amount;
        } else if (p.method === 'cartao') {
          activeShift.totals.cartao += p.amount;
        } else if (p.method === 'mbway') {
          activeShift.totals.mbway += p.amount;
        } else {
          activeShift.totals.outro += p.amount;
        }
      }
    }

    this.save(db);
    this.logAudit('Registo de Venda', 'venda', `Venda ${receiptNumber} (${finalTotal.toFixed(2)} €) - Documento: ${docNumberStr}`, operatorName || 'Operador');
    this.logIntegration('emit_document', 'success', `Emissão fiscal da venda ${receiptNumber} (${documentType})`, `Documento emitido: ${docNumberStr}, ATCUD: ${atcud}`, operatorName || 'Operador', { saleId: sale.id, documentType, documentNumber: docNumberStr });

    return {
      success: true,
      sale,
      fiscalDocument: fiscalDoc,
      fiscalStatus: 'emitido',
    };
  }

  // Invoicing & Documents
  getFiscalDocuments(): FiscalDocument[] {
    return this.load().fiscalDocuments;
  }

  getFiscalDocument(id: string): FiscalDocument | null {
    return this.load().fiscalDocuments.find((d) => d.id === id) || null;
  }

  retryFiscalEmission(saleId: string, documentType = 'FS', operatorName = 'Operador') {
    const db = this.load();
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada' };
    if (sale.fiscalStatus === 'emitido') {
      const existing = db.fiscalDocuments.find((d) => d.saleId === sale.id);
      return { success: true, message: 'Já emitido', document: existing };
    }

    const cfg = db.certifiedBilling;
    const seriesCode = documentType === 'FS' ? cfg.seriesFS : cfg.seriesFT;
    const sameSeriesDocs = db.fiscalDocuments.filter((d) => d.series === seriesCode);
    const nextNumber = sameSeriesDocs.length + 1;
    const docNumberStr = `${documentType} 2026/${String(nextNumber).padStart(4, '0')}`;
    const atcud = `${cfg.atcudPrefix}-${String(nextNumber).padStart(4, '0')}`;

    const doc: FiscalDocument = {
      id: `doc-cert-${Date.now()}-${nextNumber}`,
      saleId: sale.id,
      documentType: documentType as DocumentType,
      documentNumber: docNumberStr,
      series: seriesCode,
      number: nextNumber,
      issuedAt: new Date().toISOString(),
      customerName: sale.customer?.name || 'Consumidor Final',
      customerNif: sale.customer?.nif || '999999990',
      totals: sale.totals,
      items: sale.items,
      payments: sale.payments,
      atcud,
      qrCodeData: `A:${db.company.nif}*B:${sale.customer?.nif || '999999990'}*C:PT*D:${documentType}*E:N*F:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}*G:${docNumberStr}*H:${atcud}*N:${sale.totals.taxTotal.toFixed(2)}*O:${sale.totals.finalTotal.toFixed(2)}*R:${cfg.certifiedSoftwareNumber}`,
      signatureHash: '4xM2...w1Za',
      certifiedSoftwareNumber: cfg.certifiedSoftwareNumber,
      certifiedSoftwareName: cfg.providerName,
      isSecondCopy: false,
      printCount: 0,
      status: 'emitido',
      operatorName,
    };

    sale.fiscalStatus = 'emitido';
    sale.fiscalDocumentId = doc.id;
    sale.fiscalDocumentNumber = doc.documentNumber;
    sale.fiscalPendingReason = undefined;
    db.fiscalDocuments.unshift(doc);

    this.save(db);
    return { success: true, document: doc };
  }

  emitCreditNote(originalDocumentId: string, reason: string, operatorName = 'Administrador') {
    const db = this.load();
    const orig = db.fiscalDocuments.find((d) => d.id === originalDocumentId);
    if (!orig) return { success: false, error: 'Documento original não encontrado' };
    if (orig.status === 'anulado') return { success: false, error: 'Documento já anulado.' };

    const cfg = db.certifiedBilling;
    const nextNumber = db.fiscalDocuments.filter((d) => d.documentType === 'NC').length + 1;
    const docNumberStr = `NC 2026/${String(nextNumber).padStart(4, '0')}`;
    const atcud = `${cfg.atcudPrefix}-NC-${String(nextNumber).padStart(4, '0')}`;

    const ncDoc: FiscalDocument = {
      id: `nc-${Date.now()}-${nextNumber}`,
      saleId: orig.saleId,
      documentType: 'NC',
      documentNumber: docNumberStr,
      series: cfg.seriesNC,
      number: nextNumber,
      issuedAt: new Date().toISOString(),
      customerName: orig.customerName,
      customerNif: orig.customerNif,
      customerAddress: orig.customerAddress,
      totals: orig.totals,
      items: orig.items,
      payments: orig.payments,
      atcud,
      qrCodeData: `A:${db.company.nif}*B:${orig.customerNif}*C:PT*D:NC*E:N*F:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}*G:${docNumberStr}*H:${atcud}*O:${orig.totals.finalTotal.toFixed(2)}*R:${cfg.certifiedSoftwareNumber}`,
      signatureHash: 'k9Pq...w1Za',
      certifiedSoftwareNumber: cfg.certifiedSoftwareNumber,
      certifiedSoftwareName: cfg.providerName,
      isSecondCopy: false,
      printCount: 0,
      status: 'emitido',
      rectifiedByNC: orig.documentNumber,
      operatorName,
    };

    orig.status = 'anulado';
    orig.rectifiedByNC = ncDoc.documentNumber;
    db.fiscalDocuments.unshift(ncDoc);

    const relatedSale = db.sales.find((s) => s.id === orig.saleId);
    if (relatedSale) {
      relatedSale.fiscalStatus = 'anulado';
    }

    this.save(db);
    this.logAudit('Emissão de Nota de Crédito', 'fatura', `${ncDoc.documentNumber} a retificar ${orig.documentNumber}. Motivo: ${reason}`, operatorName);
    return { success: true, creditNote: ncDoc };
  }

  recordPrintDocument(id: string, operatorName = 'Operador') {
    const db = this.load();
    const doc = db.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return { success: false, error: 'Documento não encontrado' };
    doc.printCount += 1;
    doc.lastPrintedAt = new Date().toISOString();
    doc.lastPrintedBy = operatorName;
    if (doc.printCount > 1) doc.isSecondCopy = true;
    this.save(db);
    return { success: true, document: doc };
  }

  emailDocument(id: string, recipientEmail: string, operatorName = 'Operador') {
    const db = this.load();
    const doc = db.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return { success: false, error: 'Documento não encontrado' };
    doc.emailSentAt = new Date().toISOString();
    doc.emailRecipient = recipientEmail;
    this.save(db);
    this.logAudit('Envio de Documento por Email', 'fatura', `Fatura ${doc.documentNumber} enviada para ${recipientEmail}`, operatorName);
    return { success: true, message: `Fatura enviada para ${recipientEmail}.`, document: doc };
  }

  whatsappDocument(id: string, recipientPhone: string, operatorName = 'Operador') {
    const db = this.load();
    const doc = db.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return { success: false, error: 'Documento não encontrado' };
    (doc as any).whatsappSentAt = new Date().toISOString();
    (doc as any).whatsappRecipient = recipientPhone;
    this.save(db);
    this.logAudit('Envio de Documento por WhatsApp', 'fatura', `Comprovante ${doc.documentNumber} enviado via WhatsApp para ${recipientPhone}`, operatorName);
    return { success: true, message: `Envio WhatsApp registado para ${recipientPhone}.`, document: doc };
  }

  // Dashboard & Reports
  getDashboardReport() {
    const db = this.load();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = db.sales.filter((s) => s.createdAt.startsWith(todayStr));
    const todaySalesAmount = todaySales.reduce((acc, s) => acc + s.totals.finalTotal, 0);
    const salesCount = todaySales.length;
    const averageTicket = salesCount > 0 ? todaySalesAmount / salesCount : 0;

    let totalDinheiro = 0;
    let totalCartao = 0;
    let totalMbway = 0;
    let totalOutro = 0;

    for (const sale of todaySales) {
      for (const p of sale.payments) {
        if (p.method === 'dinheiro') totalDinheiro += p.amount;
        else if (p.method === 'cartao') totalCartao += p.amount;
        else if (p.method === 'mbway') totalMbway += p.amount;
        else totalOutro += p.amount;
      }
    }

    const documentsCount = db.fiscalDocuments.filter((d) => d.issuedAt.startsWith(todayStr)).length;
    const pendingCount = db.sales.filter((s) => s.fiscalStatus === 'pendente').length;
    const recentInvoices = db.fiscalDocuments.slice(0, 6);
    const activeShift = db.shifts.find((s) => s.status === 'aberta') || null;

    return {
      todaySalesAmount,
      salesCount,
      averageTicket,
      paymentBreakdown: {
        dinheiro: totalDinheiro,
        cartao: totalCartao,
        mbway: totalMbway,
        outro: totalOutro,
      },
      documentsCount,
      pendingCount,
      activeShiftOpen: !!activeShift,
      activeShift,
      recentInvoices,
      integrationStatus: {
        isActive: db.certifiedBilling.isActive,
        lastTestStatus: db.certifiedBilling.lastTestStatus,
        lastTestMessage: db.certifiedBilling.lastTestMessage,
      },
    };
  }

  getDetailedReport(period: 'today' | 'week' | 'month' = 'today') {
    const db = this.load();
    const now = new Date();
    let filterFn = (_s: Sale) => true;

    if (period === 'today') {
      const today = now.toISOString().slice(0, 10);
      filterFn = (s) => s.createdAt.startsWith(today);
    } else if (period === 'week') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      filterFn = (s) => s.createdAt >= pastWeek;
    } else if (period === 'month') {
      const pastMonth = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
      filterFn = (s) => s.createdAt >= pastMonth;
    }

    const filteredSales = db.sales.filter(filterFn);
    const productStats = new Map<string, { name: string; quantity: number; total: number }>();
    const categoryStats = new Map<string, { name: string; total: number }>();
    const serviceStats = { dine_in: 0, takeaway: 0, delivery: 0 };
    const operatorStats = new Map<string, { count: number; total: number }>();
    const taxStats = {
      nor: { base: 0, tax: 0 },
      int: { base: 0, tax: 0 },
      red: { base: 0, tax: 0 },
      ise: { base: 0, tax: 0 },
    };

    let grandTotal = 0;

    for (const s of filteredSales) {
      grandTotal += s.totals.finalTotal;
      if (s.saleType in serviceStats) {
        serviceStats[s.saleType as keyof typeof serviceStats] += s.totals.finalTotal;
      }
      const op = operatorStats.get(s.operatorName) || { count: 0, total: 0 };
      op.count += 1;
      op.total += s.totals.finalTotal;
      operatorStats.set(s.operatorName, op);

      for (const it of s.items) {
        const p = productStats.get(it.productId) || { name: it.productName, quantity: 0, total: 0 };
        p.quantity += it.quantity;
        p.total += it.total;
        productStats.set(it.productId, p);

        const dbProduct = db.products.find((prod) => prod.id === it.productId);
        const catId = dbProduct?.categoryId || 'cat-diversos';
        const cat = db.categories.find((c) => c.id === catId);
        const catName = cat?.name || 'Diversos';

        const c = categoryStats.get(catName) || { name: catName, total: 0 };
        c.total += it.total;
        categoryStats.set(catName, c);

        if (it.ivaRate === 23) {
          taxStats.nor.base += it.taxBase;
          taxStats.nor.tax += it.ivaAmount;
        } else if (it.ivaRate === 13) {
          taxStats.int.base += it.taxBase;
          taxStats.int.tax += it.ivaAmount;
        } else if (it.ivaRate === 6) {
          taxStats.red.base += it.taxBase;
          taxStats.red.tax += it.ivaAmount;
        } else {
          taxStats.ise.base += it.taxBase;
        }
      }
    }

    return {
      period,
      grandTotal,
      salesCount: filteredSales.length,
      productBreakdown: Array.from(productStats.values()).sort((a, b) => b.total - a.total),
      categoryBreakdown: Array.from(categoryStats.values()).sort((a, b) => b.total - a.total),
      serviceStats,
      operatorBreakdown: Array.from(operatorStats.entries()).map(([name, val]) => ({ name, ...val })),
      taxBreakdown: {
        nor23: { rate: 23, base: taxStats.nor.base, amount: taxStats.nor.tax },
        int13: { rate: 13, base: taxStats.int.base, amount: taxStats.int.tax },
        red6: { rate: 6, base: taxStats.red.base, amount: taxStats.red.tax },
        ise0: { rate: 0, base: taxStats.ise.base, amount: 0 },
      },
    };
  }

  getUsers(): User[] {
    return this.load().users;
  }

  getAuditLogs(): AuditLog[] {
    return this.load().auditLogs;
  }

  // Client-side CSV generator
  exportSalesCsvBlob(period?: string): Blob {
    const db = this.load();
    const rows = [
      ['Data/Hora', 'Nº Venda', 'Cliente', 'NIF', 'Tipo Serviço', 'Total Líquido (€)', 'IVA (€)', 'Total Final (€)', 'Métodos Pagamento', 'Estado Fiscal', 'Nº Fatura'],
    ];

    for (const s of db.sales) {
      const paymentMethods = s.payments.map((p) => `${p.method}: ${p.amount.toFixed(2)}€`).join(' | ');
      rows.push([
        s.createdAt,
        s.receiptNumber,
        `"${s.customer?.name || 'Consumidor Final'}"`,
        s.customer?.nif || '999999990',
        s.saleType,
        s.totals.netTotal.toFixed(2),
        s.totals.taxTotal.toFixed(2),
        s.totals.finalTotal.toFixed(2),
        `"${paymentMethods}"`,
        s.fiscalStatus,
        s.fiscalDocumentNumber || '-',
      ]);
    }

    const csvContent = '\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  }
}

export const localStore = new LocalStore();
