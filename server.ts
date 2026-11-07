import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { db } from './server/db';
import { VendusBillingAdapter } from './server/invoicingAdapter';
import {
  Sale,
  SaleItem,
  DocumentType,
  PaymentEntry,
  Product,
  Customer,
  AuditLog,
  IntegrationLog,
} from './src/types';
import { generateFiscalDocumentPdf } from './src/lib/pdfGenerator';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const billingAdapter = new VendusBillingAdapter(db.get().certifiedBilling);

// Helper para auditoria
function logAudit(action: string, category: AuditLog['category'], details: string, userName = 'Sistema', userId = 'usr-system') {
  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    category,
    details,
  };
  db.update((data) => {
    data.auditLogs.unshift(newLog);
    if (data.auditLogs.length > 500) data.auditLogs.pop();
  });
}

// Helper para log de integração
function logIntegration(
  action: IntegrationLog['action'],
  status: IntegrationLog['status'],
  requestSummary: string,
  responseSummary: string,
  operatorName: string,
  extra: Partial<IntegrationLog> = {}
) {
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
  db.update((data) => {
    data.integrationLogs.unshift(log);
    if (data.integrationLogs.length > 200) data.integrationLogs.pop();
  });
}

// ---------------------- STATUS & CONFIG ----------------------

app.get('/api/status', (req: Request, res: Response) => {
  const current = db.get();
  const activeShift = current.shifts.find((s) => s.status === 'aberta');
  res.json({
    online: true,
    serverTime: new Date().toISOString(),
    companyName: current.company.name,
    activeShift: activeShift || null,
    certifiedBilling: {
      provider: current.certifiedBilling.provider,
      providerName: current.certifiedBilling.providerName,
      isActive: current.certifiedBilling.isActive,
      environment: current.certifiedBilling.environment,
      hasApiKey: !!current.certifiedBilling.apiKey,
      lastTestStatus: current.certifiedBilling.lastTestStatus,
      lastTestMessage: current.certifiedBilling.lastTestMessage,
    },
  });
});

app.get('/api/company', (req: Request, res: Response) => {
  res.json(db.get().company);
});

app.put('/api/company', (req: Request, res: Response) => {
  const updated = req.body;
  db.update((data) => {
    data.company = { ...data.company, ...updated };
  });
  logAudit('Atualização de Dados da Empresa', 'sistema', 'Dados fiscais/comerciais atualizados.', req.body.operatorName || 'Administrador');
  res.json({ success: true, company: db.get().company });
});

app.get('/api/certified-billing', (req: Request, res: Response) => {
  const cfg = db.get().certifiedBilling;
  // Nunca expor chave de API crua ao frontend
  const maskedKey = cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}••••••••${cfg.apiKey.slice(-4)}` : '';
  res.json({
    ...cfg,
    apiKey: maskedKey,
    hasApiKey: !!cfg.apiKey && cfg.apiKey.length > 0,
  });
});

app.put('/api/certified-billing', (req: Request, res: Response) => {
  const { apiKey, registerId, seriesFS, seriesFT, seriesFR, seriesNC, environment, isActive, operatorName } = req.body;

  db.update((data) => {
    const current = data.certifiedBilling;
    if (apiKey !== undefined && !apiKey.includes('••••')) {
      current.apiKey = apiKey.trim();
      current.hasApiKey = !!apiKey.trim();
    }
    if (registerId !== undefined) current.registerId = registerId.trim();
    if (seriesFS !== undefined) current.seriesFS = seriesFS.trim();
    if (seriesFT !== undefined) current.seriesFT = seriesFT.trim();
    if (seriesFR !== undefined) current.seriesFR = seriesFR.trim();
    if (seriesNC !== undefined) current.seriesNC = seriesNC.trim();
    if (environment !== undefined) current.environment = environment;
    if (isActive !== undefined) current.isActive = isActive;

    billingAdapter.updateConfig(current);
  });

  logAudit(
    'Definições de Faturação Certificada',
    'sistema',
    `Configurações da API de faturação atualizadas (Ambiente: ${environment}, Ativo: ${isActive}).`,
    operatorName || 'Administrador'
  );

  res.json({ success: true, message: 'Configurações de faturação certificada guardadas com sucesso no servidor.' });
});

app.post('/api/certified-billing/test', async (req: Request, res: Response) => {
  const { operatorName } = req.body;
  const cfg = db.get().certifiedBilling;
  billingAdapter.updateConfig(cfg);

  const result = await billingAdapter.testConnection();

  db.update((data) => {
    data.certifiedBilling.lastTestStatus = result.success ? 'success' : 'error';
    data.certifiedBilling.lastTestMessage = result.message;
    data.certifiedBilling.lastTestDate = new Date().toISOString();
  });

  logIntegration(
    'test_connection',
    result.success ? 'success' : 'error',
    `Teste de ligação à API certificada (${cfg.providerName}, modo: ${cfg.environment})`,
    result.message,
    operatorName || 'Operador',
    { errorMessage: result.success ? undefined : result.message }
  );

  res.json(result);
});

// ---------------------- PRODUTOS & CATEGORIAS ----------------------

app.get('/api/categories', (req: Request, res: Response) => {
  res.json(db.get().categories);
});

app.get('/api/products', (req: Request, res: Response) => {
  res.json(db.get().products);
});

app.post('/api/products', (req: Request, res: Response) => {
  const p = req.body;
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name: p.name,
    description: p.description || '',
    categoryId: p.categoryId,
    price: Number(p.price) || 0,
    ivaRate: Number(p.ivaRate) || 13,
    ivaCode: p.ivaRate === 23 ? 'NOR' : p.ivaRate === 13 ? 'INT' : p.ivaRate === 6 ? 'RED' : 'ISE',
    isAccountantValidated: !!p.isAccountantValidated,
    accountantValidationDate: p.isAccountantValidated ? new Date().toISOString().slice(0, 10) : undefined,
    available: p.available !== undefined ? p.available : true,
    internalCode: p.internalCode || '',
    imageUrl: p.imageUrl || '',
    isFavorite: !!p.isFavorite,
    priceHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.update((data) => {
    data.products.push(newProduct);
  });

  logAudit('Criação de Produto', 'produto', `Produto criado: ${newProduct.name} (${newProduct.price.toFixed(2)} €)`, p.operatorName || 'Administrador');

  res.json({ success: true, product: newProduct });
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const p = req.body;

  let updatedProduct: Product | null = null;

  db.update((data) => {
    const prod = data.products.find((item) => item.id === id);
    if (!prod) return;

    const oldPrice = prod.price;
    const newPrice = p.price !== undefined ? Number(p.price) : prod.price;

    if (oldPrice !== newPrice) {
      prod.priceHistory.unshift({
        id: `ph-${Date.now()}`,
        oldPrice,
        newPrice,
        changedAt: new Date().toISOString(),
        changedBy: p.operatorName || 'Administrador',
        reason: p.priceChangeReason || 'Ajuste de preço no catálogo',
      });
    }

    prod.name = p.name !== undefined ? p.name : prod.name;
    prod.description = p.description !== undefined ? p.description : prod.description;
    prod.categoryId = p.categoryId !== undefined ? p.categoryId : prod.categoryId;
    prod.price = newPrice;
    if (p.ivaRate !== undefined) {
      prod.ivaRate = Number(p.ivaRate);
      prod.ivaCode = prod.ivaRate === 23 ? 'NOR' : prod.ivaRate === 13 ? 'INT' : prod.ivaRate === 6 ? 'RED' : 'ISE';
    }
    if (p.isAccountantValidated !== undefined) {
      prod.isAccountantValidated = p.isAccountantValidated;
      if (p.isAccountantValidated) {
        prod.accountantValidationDate = new Date().toISOString().slice(0, 10);
      }
    }
    prod.available = p.available !== undefined ? p.available : prod.available;
    prod.internalCode = p.internalCode !== undefined ? p.internalCode : prod.internalCode;
    prod.imageUrl = p.imageUrl !== undefined ? p.imageUrl : prod.imageUrl;
    prod.isFavorite = p.isFavorite !== undefined ? p.isFavorite : prod.isFavorite;
    prod.updatedAt = new Date().toISOString();

    updatedProduct = prod;
  });

  if (!updatedProduct) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  logAudit('Edição de Produto', 'produto', `Produto atualizado: ${(updatedProduct as Product).name}`, p.operatorName || 'Administrador');

  res.json({ success: true, product: updatedProduct });
});

app.post('/api/products/:id/validate-accountant', (req: Request, res: Response) => {
  const { id } = req.params;
  const { accountantName, notes } = req.body;

  let validatedProd: Product | null = null;
  db.update((data) => {
    const prod = data.products.find((item) => item.id === id);
    if (!prod) return;
    prod.isAccountantValidated = true;
    prod.accountantValidationDate = new Date().toISOString().slice(0, 10);
    prod.updatedAt = new Date().toISOString();
    validatedProd = prod;
  });

  if (!validatedProd) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  logAudit(
    'Validação Contabilística de IVA',
    'produto',
    `Taxa de IVA (${(validatedProd as Product).ivaRate}%) validada pelo contabilista: ${accountantName || 'Contabilista Certificado'}`,
    accountantName || 'Contabilista'
  );

  res.json({ success: true, product: validatedProd });
});

// ---------------------- CLIENTES ----------------------

app.get('/api/customers', (req: Request, res: Response) => {
  res.json(db.get().customers);
});

app.post('/api/customers', (req: Request, res: Response) => {
  const c = req.body;
  const isUpdate = !!c.id;

  let savedCustomer: Customer;

  db.update((data) => {
    if (isUpdate) {
      const idx = data.customers.findIndex((item) => item.id === c.id);
      if (idx !== -1) {
        data.customers[idx] = {
          ...data.customers[idx],
          name: c.name,
          nif: c.nif.replace(/\D/g, ''),
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          postalCode: c.postalCode || '',
          city: c.city || '',
          notes: c.notes || '',
          rgpdConsent: c.rgpdConsent !== undefined ? c.rgpdConsent : true,
          rgpdConsentDate: c.rgpdConsent ? new Date().toISOString().slice(0, 10) : undefined,
        };
        savedCustomer = data.customers[idx];
        return;
      }
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: c.name,
      nif: c.nif.replace(/\D/g, ''),
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      postalCode: c.postalCode || '',
      city: c.city || '',
      country: 'Portugal',
      notes: c.notes || '',
      rgpdConsent: c.rgpdConsent !== undefined ? c.rgpdConsent : true,
      rgpdConsentDate: new Date().toISOString().slice(0, 10),
      totalSpent: 0,
      ordersCount: 0,
      createdAt: new Date().toISOString(),
    };
    data.customers.push(newCustomer);
    savedCustomer = newCustomer;
  });

  logAudit(
    isUpdate ? 'Atualização de Cliente' : 'Registo de Cliente',
    'cliente',
    `Cliente ${savedCustomer!.name} (NIF: ${savedCustomer!.nif})`,
    c.operatorName || 'Operador'
  );

  res.json({ success: true, customer: savedCustomer! });
});

// RGPD: Anonimização de cliente
app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorName } = req.body;

  let anonymizedName = '';
  db.update((data) => {
    const cust = data.customers.find((c) => c.id === id);
    if (!cust) return;
    anonymizedName = cust.name;
    cust.name = `Cliente Anónimo (RGPD #${id.slice(-4)})`;
    cust.email = '';
    cust.phone = '';
    cust.address = '';
    cust.postalCode = '';
    cust.city = '';
    cust.notes = 'Dados pessoais anonimizados a pedido do titular nos termos do RGPD.';
    cust.rgpdConsent = false;
  });

  logAudit('Direito ao Esquecimento RGPD', 'cliente', `Anonimização de dados do cliente ${anonymizedName}`, operatorName || 'Administrador');

  res.json({ success: true, message: 'Dados pessoais anonimizados com sucesso.' });
});

// ---------------------- GESTÃO DE CAIXA (SHIFTS) ----------------------

app.get('/api/shifts', (req: Request, res: Response) => {
  res.json(db.get().shifts);
});

app.get('/api/shifts/current', (req: Request, res: Response) => {
  const active = db.get().shifts.find((s) => s.status === 'aberta');
  res.json(active || null);
});

app.post('/api/shifts/open', (req: Request, res: Response) => {
  const { openingAmount, operatorName } = req.body;
  const current = db.get();
  const existingActive = current.shifts.find((s) => s.status === 'aberta');
  if (existingActive) {
    res.status(400).json({ error: 'Já existe uma caixa aberta. É necessário fechar a anterior antes de abrir uma nova.' });
    return;
  }

  const initialVal = Number(openingAmount) || 0;
  const nextShiftNum = current.shifts.length + 101;

  const newShift = {
    id: `shift-${Date.now()}`,
    shiftNumber: nextShiftNum,
    openedAt: new Date().toISOString(),
    openedBy: operatorName || 'Operador de Balcão',
    openingAmount: initialVal,
    expectedCashAmount: initialVal,
    status: 'aberta' as const,
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

  db.update((data) => {
    data.shifts.unshift(newShift);
  });

  logAudit(
    `Abertura de Caixa #${nextShiftNum}`,
    'caixa',
    `Caixa aberta com fundo de maneio inicial de ${initialVal.toFixed(2)} €`,
    operatorName || 'Operador'
  );

  res.json({ success: true, shift: newShift });
});

app.post('/api/shifts/movement', (req: Request, res: Response) => {
  const { type, amount, reason, operatorName } = req.body;
  const current = db.get();
  const active = current.shifts.find((s) => s.status === 'aberta');

  if (!active) {
    res.status(400).json({ error: 'Não existe nenhuma sessão de caixa aberta no momento.' });
    return;
  }

  if (!reason || reason.trim().length === 0) {
    res.status(400).json({ error: 'O motivo do movimento de caixa é obrigatório.' });
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Valor inválido para o movimento.' });
    return;
  }

  const movement = {
    id: `mov-${Date.now()}`,
    shiftId: active.id,
    type: type as 'entrada' | 'saida' | 'sangria',
    amount: numAmount,
    reason: reason.trim(),
    operatorName: operatorName || 'Operador',
    timestamp: new Date().toISOString(),
  };

  db.update((data) => {
    const shift = data.shifts.find((s) => s.id === active.id);
    if (!shift) return;

    shift.movements.push(movement);
    if (type === 'entrada') {
      shift.totals.cashIn += numAmount;
      shift.expectedCashAmount += numAmount;
    } else {
      shift.totals.cashOut += numAmount;
      shift.expectedCashAmount -= numAmount;
    }
  });

  logAudit(
    `Movimento de Caixa: ${type.toUpperCase()}`,
    'caixa',
    `Valor: ${numAmount.toFixed(2)} €. Motivo: ${reason}`,
    operatorName || 'Operador'
  );

  res.json({ success: true, movement });
});

app.post('/api/shifts/close', (req: Request, res: Response) => {
  const { countedCash, closingNotes, operatorName } = req.body;
  const current = db.get();
  const active = current.shifts.find((s) => s.status === 'aberta');

  if (!active) {
    res.status(400).json({ error: 'Não existe caixa aberta para fechar.' });
    return;
  }

  const counted = Number(countedCash);
  if (isNaN(counted)) {
    res.status(400).json({ error: 'Indique o valor de dinheiro físico contado.' });
    return;
  }

  const expected = active.expectedCashAmount;
  const difference = counted - expected;

  let closedShift: any;

  db.update((data) => {
    const shift = data.shifts.find((s) => s.id === active.id);
    if (!shift) return;

    shift.status = 'fechada';
    shift.closedAt = new Date().toISOString();
    shift.closedBy = operatorName || 'Operador';
    shift.closingCountedAmount = counted;
    shift.difference = difference;
    shift.closingNotes = closingNotes || '';
    closedShift = shift;
  });

  logAudit(
    `Fecho de Caixa #${active.shiftNumber}`,
    'caixa',
    `Contado: ${counted.toFixed(2)} €, Esperado: ${expected.toFixed(2)} €, Diferença: ${difference.toFixed(2)} €`,
    operatorName || 'Operador'
  );

  res.json({ success: true, shift: closedShift });
});

// ---------------------- VENDAS & POS ----------------------

app.get('/api/sales', (req: Request, res: Response) => {
  const { startDate, endDate, nif, fiscalStatus, paymentMethod, saleType } = req.query;
  let list = db.get().sales;

  if (startDate) {
    list = list.filter((s) => s.createdAt >= String(startDate));
  }
  if (endDate) {
    list = list.filter((s) => s.createdAt <= String(endDate));
  }
  if (nif) {
    list = list.filter((s) => s.customer?.nif.includes(String(nif)));
  }
  if (fiscalStatus) {
    list = list.filter((s) => s.fiscalStatus === fiscalStatus);
  }
  if (saleType) {
    list = list.filter((s) => s.saleType === saleType);
  }
  if (paymentMethod) {
    list = list.filter((s) => s.payments.some((p) => p.method === paymentMethod));
  }

  res.json(list);
});

app.get('/api/sales/:id', (req: Request, res: Response) => {
  const sale = db.get().sales.find((s) => s.id === req.params.id);
  if (!sale) {
    res.status(404).json({ error: 'Venda não encontrada' });
    return;
  }
  res.json(sale);
});

app.post('/api/sales', async (req: Request, res: Response) => {
  const {
    items,
    payments,
    saleType,
    tableNumber,
    orderReference,
    customer,
    operatorId,
    operatorName,
    notes,
    documentType = 'FS', // Default: Fatura Simplificada
  } = req.body;

  const current = db.get();
  const activeShift = current.shifts.find((s) => s.status === 'aberta');
  const shiftId = activeShift ? activeShift.id : 'shift-default';

  if (!items || items.length === 0) {
    res.status(400).json({ error: 'A venda deve conter pelo menos um item.' });
    return;
  }

  // Cálculos fiscais e totais por taxa de IVA
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

    // Base de incidência = Total / (1 + taxa/100)
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

  const saleNumberSeq = current.sales.length + 1;
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
    fiscalStatus: 'pendente',
    notes,
  };

  // 1. Tentar emissão fiscal imediata através do conector certificado
  const emissionResult = await billingAdapter.emitDocument(
    {
      sale,
      company: current.company,
      config: current.certifiedBilling,
      documentType: (documentType as DocumentType) || 'FS',
      operatorName: operatorName || 'Operador',
    },
    current.fiscalDocuments
  );

  let issuedDoc: any = null;

  if (emissionResult.success && emissionResult.document) {
    issuedDoc = emissionResult.document;
    sale.fiscalStatus = 'emitido';
    sale.fiscalDocumentId = issuedDoc.id;
    sale.fiscalDocumentNumber = issuedDoc.documentNumber;

    logIntegration(
      'emit_document',
      'success',
      `Emissão fiscal da venda ${sale.receiptNumber} (${documentType})`,
      `Documento emitido: ${issuedDoc.documentNumber}, ATCUD: ${issuedDoc.atcud}`,
      operatorName || 'Operador',
      {
        saleId: sale.id,
        documentType,
        documentNumber: issuedDoc.documentNumber,
      }
    );
  } else {
    sale.fiscalStatus = 'pendente';
    sale.fiscalPendingReason = emissionResult.errorMessage || 'Integração indisponível no momento.';

    logIntegration(
      'emit_document',
      'warning',
      `Tentativa de emissão fiscal da venda ${sale.receiptNumber}`,
      `Venda salva como pendente: ${emissionResult.errorMessage}`,
      operatorName || 'Operador',
      {
        saleId: sale.id,
        documentType,
        errorMessage: emissionResult.errorMessage,
      }
    );
  }

  // 2. Persistir venda e documento no banco de dados
  db.update((data) => {
    data.sales.unshift(sale);

    if (issuedDoc) {
      data.fiscalDocuments.unshift(issuedDoc);
    }

    // Atualizar métricas do cliente, se associado
    if (customer && customer.id) {
      const dbCust = data.customers.find((c) => c.id === customer.id);
      if (dbCust) {
        dbCust.totalSpent += finalTotal;
        dbCust.ordersCount += 1;
      }
    }

    // Atualizar totais da sessão de caixa
    if (activeShift) {
      const shift = data.shifts.find((s) => s.id === activeShift.id);
      if (shift) {
        shift.totals.salesCount += 1;
        shift.totals.totalRevenue += finalTotal;
        for (const p of validatedPayments) {
          if (p.method === 'dinheiro') {
            shift.totals.dinheiro += p.amount;
            shift.expectedCashAmount += p.amount;
          } else if (p.method === 'cartao') {
            shift.totals.cartao += p.amount;
          } else if (p.method === 'mbway') {
            shift.totals.mbway += p.amount;
          } else {
            shift.totals.outro += p.amount;
          }
        }
      }
    }
  });

  logAudit(
    'Registo de Venda',
    'venda',
    `Venda ${receiptNumber} (${finalTotal.toFixed(2)} €) - Estado fiscal: ${sale.fiscalStatus.toUpperCase()}`,
    operatorName || 'Operador'
  );

  res.json({
    success: true,
    sale,
    fiscalDocument: issuedDoc,
    fiscalStatus: sale.fiscalStatus,
    pendingReason: sale.fiscalPendingReason,
  });
});

// ---------------------- FATURAÇÃO CERTIFICADA & REENTREGA ----------------------

app.get('/api/invoicing/documents', (req: Request, res: Response) => {
  res.json(db.get().fiscalDocuments);
});

app.get('/api/invoicing/documents/:id', (req: Request, res: Response) => {
  const doc = db.get().fiscalDocuments.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Documento fiscal não encontrado' });
    return;
  }
  res.json(doc);
});

// Download e visualização oficial do PDF gerado da Nota Fiscal
app.get('/api/invoicing/documents/:id/pdf', (req: Request, res: Response) => {
  const current = db.get();
  const doc = current.fiscalDocuments.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).send('Documento fiscal não encontrado.');
    return;
  }

  try {
    const pdf = generateFiscalDocumentPdf(doc, current.company);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const safeDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Nota_Fiscal_${safeDocNum}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao gerar PDF da nota:', err);
    res.status(500).send('Erro ao gerar PDF do comprovante fiscal.');
  }
});

app.get('/api/invoicing/documents/:id/download', (req: Request, res: Response) => {
  const current = db.get();
  const doc = current.fiscalDocuments.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).send('Documento fiscal não encontrado.');
    return;
  }

  try {
    const pdf = generateFiscalDocumentPdf(doc, current.company);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const safeDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Nota_Fiscal_${safeDocNum}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao gerar download do PDF:', err);
    res.status(500).send('Erro ao baixar PDF da nota.');
  }
});

// Tentar novamente a emissão fiscal de uma venda pendente com idempotência
app.post('/api/invoicing/retry/:saleId', async (req: Request, res: Response) => {
  const { saleId } = req.params;
  const { documentType = 'FS', operatorName = 'Operador' } = req.body;
  const current = db.get();

  const sale = current.sales.find((s) => s.id === saleId);
  if (!sale) {
    res.status(404).json({ error: 'Venda não encontrada' });
    return;
  }

  // Idempotência: Se já foi emitido, não volta a emitir
  if (sale.fiscalStatus === 'emitido') {
    const existingDoc = current.fiscalDocuments.find((d) => d.saleId === sale.id);
    res.json({
      success: true,
      message: 'Esta venda já possui documento fiscal emitido.',
      document: existingDoc,
    });
    return;
  }

  const result = await billingAdapter.emitDocument(
    {
      sale,
      company: current.company,
      config: current.certifiedBilling,
      documentType: (documentType as DocumentType) || 'FS',
      operatorName,
    },
    current.fiscalDocuments
  );

  if (!result.success || !result.document) {
    db.update((data) => {
      const s = data.sales.find((item) => item.id === saleId);
      if (s) {
        s.retryAttempts = (s.retryAttempts || 0) + 1;
        s.lastRetryAt = new Date().toISOString();
        s.fiscalPendingReason = result.errorMessage;
      }
    });

    logIntegration(
      'emit_document',
      'error',
      `Tentativa de reemissão fiscal da venda ${sale.receiptNumber}`,
      result.errorMessage || 'Falha na emissão',
      operatorName,
      { saleId, errorMessage: result.errorMessage }
    );

    res.status(500).json({
      success: false,
      error: result.errorMessage,
    });
    return;
  }

  const doc = result.document;

  db.update((data) => {
    const s = data.sales.find((item) => item.id === saleId);
    if (s) {
      s.fiscalStatus = 'emitido';
      s.fiscalDocumentId = doc.id;
      s.fiscalDocumentNumber = doc.documentNumber;
      s.fiscalPendingReason = undefined;
    }
    data.fiscalDocuments.unshift(doc);
  });

  logIntegration(
    'emit_document',
    'success',
    `Reemissão com sucesso da venda ${sale.receiptNumber}`,
    `Documento ${doc.documentNumber} gerado via certificador`,
    operatorName,
    { saleId, documentNumber: doc.documentNumber }
  );

  res.json({
    success: true,
    message: 'Documento fiscal emitido com sucesso.',
    document: doc,
  });
});

// Emissão de Nota de Crédito (NC) retificativa
app.post('/api/invoicing/credit-note', async (req: Request, res: Response) => {
  const { originalDocumentId, reason, operatorName = 'Administrador' } = req.body;
  const current = db.get();

  const originalDoc = current.fiscalDocuments.find((d) => d.id === originalDocumentId);
  if (!originalDoc) {
    res.status(404).json({ error: 'Documento original não encontrado' });
    return;
  }

  if (!reason || reason.trim().length < 5) {
    res.status(400).json({ error: 'É obrigatório indicar o motivo legal da emissão da Nota de Crédito (mínimo 5 carateres).' });
    return;
  }

  const result = await billingAdapter.emitCreditNote(
    {
      originalDocument: originalDoc,
      reason: reason.trim(),
      company: current.company,
      config: current.certifiedBilling,
      operatorName,
    },
    current.fiscalDocuments
  );

  if (!result.success || !result.document) {
    res.status(500).json({ error: result.errorMessage || 'Erro ao emitir Nota de Crédito.' });
    return;
  }

  const ncDoc = result.document;

  db.update((data) => {
    const orig = data.fiscalDocuments.find((d) => d.id === originalDocumentId);
    if (orig) {
      orig.status = 'anulado';
      orig.rectifiedByNC = ncDoc.documentNumber;
    }
    data.fiscalDocuments.unshift(ncDoc);

    const relatedSale = data.sales.find((s) => s.id === originalDoc.saleId);
    if (relatedSale) {
      relatedSale.fiscalStatus = 'anulado';
    }
  });

  logIntegration(
    'credit_note',
    'success',
    `Emissão de Nota de Crédito para o documento ${originalDoc.documentNumber}`,
    `Nota de Crédito ${ncDoc.documentNumber} emitida. Motivo: ${reason}`,
    operatorName,
    { documentNumber: ncDoc.documentNumber }
  );

  logAudit(
    'Emissão de Nota de Crédito',
    'fatura',
    `${ncDoc.documentNumber} a retificar ${originalDoc.documentNumber}. Motivo: ${reason}`,
    operatorName
  );

  res.json({
    success: true,
    message: 'Nota de Crédito retificativa emitida com sucesso.',
    creditNote: ncDoc,
  });
});

// Impressão e 2ª via de documento
app.post('/api/invoicing/documents/:id/print', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorName } = req.body;

  let docToPrint: any = null;

  db.update((data) => {
    const doc = data.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return;
    doc.printCount += 1;
    doc.lastPrintedAt = new Date().toISOString();
    doc.lastPrintedBy = operatorName || 'Operador';
    if (doc.printCount > 1) {
      doc.isSecondCopy = true;
    }
    docToPrint = doc;
  });

  if (!docToPrint) {
    res.status(404).json({ error: 'Documento não encontrado' });
    return;
  }

  logAudit(
    docToPrint.printCount > 1 ? 'Impressão de 2ª Via de Documento' : 'Impressão de Fatura',
    'fatura',
    `Documento ${docToPrint.documentNumber} impresso (${docToPrint.printCount}ª vez)`,
    operatorName || 'Operador'
  );

  res.json({ success: true, document: docToPrint });
});

// Envio por E-mail
app.post('/api/invoicing/documents/:id/email', (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipientEmail, operatorName } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    res.status(400).json({ error: 'Endereço de e-mail inválido.' });
    return;
  }

  let docSent: any = null;

  db.update((data) => {
    const doc = data.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return;
    doc.emailSentAt = new Date().toISOString();
    doc.emailRecipient = recipientEmail;
    docSent = doc;
  });

  if (!docSent) {
    res.status(404).json({ error: 'Documento não encontrado' });
    return;
  }

  logIntegration(
    'send_email',
    'success',
    `Envio por e-mail de ${docSent.documentNumber}`,
    `Fatura enviada com sucesso para ${recipientEmail}`,
    operatorName || 'Operador',
    { documentNumber: docSent.documentNumber }
  );

  logAudit(
    'Envio de Documento por Email',
    'fatura',
    `Fatura ${docSent.documentNumber} enviada para ${recipientEmail}`,
    operatorName || 'Operador'
  );

  res.json({
    success: true,
    message: `Fatura ${docSent.documentNumber} enviada com sucesso para ${recipientEmail}.`,
    document: docSent,
  });
});

// Envio / Compartilhamento por WhatsApp
app.post('/api/invoicing/documents/:id/whatsapp', (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipientPhone, operatorName } = req.body;

  let docSent: any = null;

  db.update((data) => {
    const doc = data.fiscalDocuments.find((d) => d.id === id);
    if (!doc) return;
    (doc as any).whatsappSentAt = new Date().toISOString();
    (doc as any).whatsappRecipient = recipientPhone;
    docSent = doc;
  });

  if (!docSent) {
    res.status(404).json({ error: 'Documento não encontrado' });
    return;
  }

  logAudit(
    'Envio de Documento por WhatsApp',
    'fatura',
    `Comprovante fiscal ${docSent.documentNumber} enviado via WhatsApp para ${recipientPhone || 'cliente'}`,
    operatorName || 'Operador'
  );

  res.json({
    success: true,
    message: `Envio WhatsApp registrado com sucesso para ${recipientPhone || 'cliente'}.`,
    document: docSent,
  });
});

// Logs de integração
app.get('/api/invoicing/logs', (req: Request, res: Response) => {
  res.json(db.get().integrationLogs);
});

// ---------------------- RELATÓRIOS & AUDITORIA ----------------------

app.get('/api/reports/dashboard', (req: Request, res: Response) => {
  const current = db.get();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todaySales = current.sales.filter((s) => s.createdAt.startsWith(todayStr));
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

  const documentsCount = current.fiscalDocuments.filter((d) => d.issuedAt.startsWith(todayStr)).length;
  const pendingCount = current.sales.filter((s) => s.fiscalStatus === 'pendente').length;
  const recentInvoices = current.fiscalDocuments.slice(0, 6);

  const activeShift = current.shifts.find((s) => s.status === 'aberta');

  res.json({
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
      isActive: current.certifiedBilling.isActive,
      lastTestStatus: current.certifiedBilling.lastTestStatus,
      lastTestMessage: current.certifiedBilling.lastTestMessage,
    },
  });
});

app.get('/api/reports/detailed', (req: Request, res: Response) => {
  const current = db.get();
  const { period = 'today' } = req.query;

  const now = new Date();
  let filterFn = (s: Sale) => true;

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

  const filteredSales = current.sales.filter(filterFn);

  // Totais por produto
  const productStats = new Map<string, { name: string; quantity: number; total: number }>();
  // Totais por categoria
  const categoryStats = new Map<string, { name: string; total: number }>();
  // Totais por tipo de serviço
  const serviceStats = { dine_in: 0, takeaway: 0, delivery: 0 };
  // Totais por utilizador
  const operatorStats = new Map<string, { count: number; total: number }>();
  // Totais por taxa de IVA
  const taxStats = {
    nor: { base: 0, tax: 0 }, // 23%
    int: { base: 0, tax: 0 }, // 13%
    red: { base: 0, tax: 0 }, // 6%
    ise: { base: 0, tax: 0 }, // 0%
  };

  let grandTotal = 0;

  for (const s of filteredSales) {
    grandTotal += s.totals.finalTotal;

    // Service type
    if (s.saleType in serviceStats) {
      serviceStats[s.saleType as keyof typeof serviceStats] += s.totals.finalTotal;
    }

    // Operator
    const op = operatorStats.get(s.operatorName) || { count: 0, total: 0 };
    op.count += 1;
    op.total += s.totals.finalTotal;
    operatorStats.set(s.operatorName, op);

    // Items
    for (const it of s.items) {
      const p = productStats.get(it.productId) || { name: it.productName, quantity: 0, total: 0 };
      p.quantity += it.quantity;
      p.total += it.total;
      productStats.set(it.productId, p);

      const dbProduct = current.products.find((prod) => prod.id === it.productId);
      const catId = dbProduct?.categoryId || 'cat-5';
      const cat = current.categories.find((c) => c.id === catId);
      const catName = cat?.name || 'Outros';

      const c = categoryStats.get(catName) || { name: catName, total: 0 };
      c.total += it.total;
      categoryStats.set(catName, c);

      // Tax breakdown
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

  res.json({
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
  });
});

app.get('/api/reports/export-csv', (req: Request, res: Response) => {
  const sales = db.get().sales;
  const rows = [
    ['Data/Hora', 'Nº Venda', 'Cliente', 'NIF', 'Tipo Serviço', 'Total Líquido (€)', 'IVA (€)', 'Total Final (€)', 'Métodos Pagamento', 'Estado Fiscal', 'Nº Fatura'],
  ];

  for (const s of sales) {
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

  const csvContent = rows.map((e) => e.join(';')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="assx_tech_vendas.csv"');
  res.send('\uFEFF' + csvContent);
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json(db.get().auditLogs);
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = db.get().users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
  }));
  res.json(users);
});

// ---------------------- VITE DEV / PROD SERVER ----------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[ASSX Tech POS Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
