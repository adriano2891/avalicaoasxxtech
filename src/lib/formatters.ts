import { DocumentType, PaymentMethodType, SaleType } from '../types';
import { APP_CONFIG } from './config';

/**
 * Formata valores monetários no padrão do Brasil (BRL / R$) com separadores brasileiros
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat(APP_CONFIG.locale, {
    style: 'currency',
    currency: APP_CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formata datas no padrão brasileiro DD/MM/AAAA
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata data e horário no padrão brasileiro 24 horas DD/MM/AAAA HH:MM
 */
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getDocumentTypeLabel(type: DocumentType): string {
  switch (type) {
    case 'FS':
      return 'Nota Fiscal / Cupom Fiscal';
    case 'FT':
      return 'Nota Fiscal com CPF/CNPJ';
    case 'FR':
      return 'Fatura / Recibo';
    case 'NC':
      return 'Nota de Crédito / Estorno';
    default:
      return type;
  }
}

export function getDocumentTypeBadgeColor(type: DocumentType): string {
  switch (type) {
    case 'FS':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'FT':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'FR':
      return 'bg-teal-100 text-teal-800 border-teal-300';
    case 'NC':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-stone-100 text-stone-800 border-stone-300';
  }
}

export function getPaymentMethodLabel(method: PaymentMethodType): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'cartao':
      return 'Cartão Débito / Crédito';
    case 'mbway':
      return 'Pix / Celular';
    case 'transferencia':
      return 'Transferência / TED';
    case 'outro':
      return 'Outro';
    default:
      return method;
  }
}

export function getSaleTypeLabel(type: SaleType): string {
  switch (type) {
    case 'dine_in':
      return 'Consumo no Local';
    case 'takeaway':
      return 'Retirada no Balcão';
    case 'delivery':
      return 'Entrega / Delivery';
    default:
      return type;
  }
}
