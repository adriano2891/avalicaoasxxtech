import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { FiscalDocument, CompanyInfo } from '../types';
import { APP_CONFIG } from '../lib/config';
import {
  TrendingUp,
  Receipt,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  PlusCircle,
  Eye,
  RefreshCw,
  Wallet,
  ShieldAlert,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { InvoiceTicketModal } from './InvoiceTicketModal';

interface DashboardViewProps {
  onStartSale: () => void;
  onOpenCash: () => void;
  onViewPendingInvoices: () => void;
  company: CompanyInfo;
  currentUser: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartSale,
  onOpenCash,
  onViewPendingInvoices,
  company,
  currentUser,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardReport();
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-sm font-semibold text-stone-600">Carregando métricas operacionais...</span>
        </div>
      </div>
    );
  }

  const {
    todaySalesAmount = 0,
    salesCount = 0,
    averageTicket = 0,
    paymentBreakdown = { dinheiro: 0, cartao: 0, mbway: 0, outro: 0 },
    documentsCount = 0,
    pendingCount = 0,
    activeShiftOpen = false,
    activeShift = null,
    recentInvoices = [],
    integrationStatus = {},
  } = data || {};

  return (
    <div className="space-y-6">
      {/* Banner de Endereço Fictício / Demonstração Institucional */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-stone-200 text-xs rounded-xl border border-stone-800 shadow-xs">
        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-amber-400">Localização (Demonstração):</span>
        <span className="text-stone-300 truncate">{APP_CONFIG.demoAddress.formatted}</span>
        <span className="ml-auto text-[10px] text-stone-400 hidden sm:inline">* {APP_CONFIG.demoAddress.notice}</span>
      </div>

      {/* Banner de Avisos Importantes */}
      <div className="space-y-3">
        {!activeShiftOpen && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Caixa Atual Fechado</h4>
                <p className="text-xs text-amber-700">
                  Abra uma sessão com fundo de troco inicial para registrar e conciliar os movimentos financeiros com segurança.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenCash}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 text-center cursor-pointer"
            >
              Abrir Caixa
            </button>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-800 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {pendingCount} Venda{pendingCount > 1 ? 's' : ''} com Faturamento Pendente
                </h4>
                <p className="text-xs text-rose-700">
                  Documento fiscal ainda não emitido pelo módulo tributário. Reenvie as vendas pendentes.
                </p>
              </div>
            </div>
            <button
              onClick={onViewPendingInvoices}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Resolver Pendências</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hero / Quick Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white shadow-lg border border-stone-800">
        <div>
          <span className="text-amber-400 text-xs font-bold tracking-wider uppercase">
            Visão Geral Diária
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
            Balcão de Vendas &amp; PDV
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            {APP_CONFIG.appName} &bull; Módulo de Ponto de Venda e Gestão Integrada
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onStartSale}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Iniciar Nova Venda</span>
          </button>
        </div>
      </div>

      {/* 4 Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Dia */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Faturado Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {formatCurrency(todaySalesAmount)}
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Valores com impostos inclusos
            </span>
          </div>
        </div>

        {/* Vendas & Ticket Médio */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Vendas &amp; Ticket Médio
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {salesCount} <span className="text-sm font-semibold text-stone-500">vendas</span>
            </div>
            <span className="text-[11px] text-stone-600 mt-1 block">
              Ticket médio: <strong className="text-stone-900">{formatCurrency(averageTicket)}</strong>
            </span>
          </div>
        </div>

        {/* Documentos Fiscais Emitidos */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Notas Emitidas
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {documentsCount} <span className="text-sm font-semibold text-stone-500">docs</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              Validação eletrônica e QR Code
            </span>
          </div>
        </div>

        {/* Vendas Pendentes */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Faturamento Pendente
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              pendingCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-stone-50 text-stone-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black tracking-tight ${pendingCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
              {pendingCount} <span className="text-sm font-semibold text-stone-500">vendas</span>
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              {pendingCount === 0 ? 'Sem pendências fiscais' : 'Aguardam transmissão'}
            </span>
          </div>
        </div>
      </div>

      {/* Formas de Pagamento Recebidas */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Recebimentos por Forma de Pagamento</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Dinheiro</span>
              <span className="text-lg font-bold text-stone-900">{formatCurrency(paymentBreakdown.dinheiro)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Cartão Débito / Crédito</span>
              <span className="text-lg font-bold text-stone-900">{formatCurrency(paymentBreakdown.cartao)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Pix / Celular</span>
              <span className="text-lg font-bold text-stone-900">{formatCurrency(paymentBreakdown.mbway)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Outros Meios</span>
              <span className="text-lg font-bold text-stone-900">{formatCurrency(paymentBreakdown.outro)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Faturas Recentes */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Comprovantes e Notas Emitidas Recentemente
            </h3>
            <p className="text-xs text-stone-500">
              Documentos com autenticação e validação cadastrada
            </p>
          </div>
          <button
            onClick={onViewPendingInvoices}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Ver todas as notas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-10 text-center text-stone-500 text-sm">
            Nenhum documento emitido hoje até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">CPF/CNPJ</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Chave / Validação</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentInvoices.map((doc: FiscalDocument) => (
                  <tr key={doc.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {doc.documentNumber}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {formatDateTime(doc.issuedAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {doc.customerName}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {doc.customerNif}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-stone-900">
                      {formatCurrency(doc.totals.finalTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-stone-100 text-stone-700">
                        {doc.atcud}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'emitido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Cupom</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Talão Fiscal */}
      {selectedDoc && (
        <InvoiceTicketModal
          document={selectedDoc}
          company={company}
          currentUser={currentUser}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
