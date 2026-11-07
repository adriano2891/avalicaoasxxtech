import React, { useState, useEffect } from 'react';
import { Sale, CompanyInfo, FiscalDocument } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime, getSaleTypeLabel, getPaymentMethodLabel } from '../lib/formatters';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  FileCheck,
  AlertCircle,
  XCircle,
  X,
  CreditCard,
  Send,
  Calendar,
} from 'lucide-react';
import { InvoiceTicketModal } from './InvoiceTicketModal';

interface SalesViewProps {
  company: CompanyInfo;
  currentUser: string;
}

export const SalesView: React.FC<SalesViewProps> = ({ company, currentUser }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fiscalFilter, setFiscalFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('all');
  const [searchNif, setSearchNif] = useState('');

  // Detalhes da Venda Selecionada
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [relatedFiscalDoc, setRelatedFiscalDoc] = useState<FiscalDocument | null>(null);
  const [ticketModalDoc, setTicketModalDoc] = useState<FiscalDocument | null>(null);

  // Estado de reemissão
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const list = await api.getSales();
      setSales(list);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = sales.filter((s) => {
    if (fiscalFilter !== 'all' && s.fiscalStatus !== fiscalFilter) return false;
    if (saleTypeFilter !== 'all' && s.saleType !== saleTypeFilter) return false;
    if (paymentFilter !== 'all' && !s.payments.some((p) => p.method === paymentFilter)) return false;
    if (searchNif.trim()) {
      const q = searchNif.toLowerCase();
      const matchNif = s.customer?.nif.includes(q);
      const matchName = s.customer?.name.toLowerCase().includes(q);
      const matchReceipt = s.receiptNumber.toLowerCase().includes(q);
      return matchNif || matchName || matchReceipt;
    }
    return true;
  });

  const handleOpenSaleDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    setRelatedFiscalDoc(null);
    setRetryMessage(null);
    if (sale.fiscalDocumentId) {
      try {
        const doc = await api.getFiscalDocument(sale.fiscalDocumentId);
        setRelatedFiscalDoc(doc);
      } catch (err) {
        console.error('Erro ao obter documento fiscal associado:', err);
      }
    }
  };

  const handleRetryEmission = async (sale: Sale) => {
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      const res = await api.retryFiscalEmission(sale.id, 'FS', currentUser);
      if (res.success && res.document) {
        setRetryMessage('Documento fiscal emitido com sucesso na AT!');
        setRelatedFiscalDoc(res.document);
        // Atualizar lista
        loadSales();
      } else {
        setRetryMessage(res.error || 'Falha ao comunicar com a API certificada.');
      }
    } catch (err: any) {
      setRetryMessage(`Erro: ${err.message || 'Falha no servidor'}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Histórico de Vendas &amp; Faturação
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Consulte todas as operações, itens faturados, meios de pagamento e documentos fiscais.
          </p>
        </div>

        <button
          onClick={loadSales}
          className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pesquisa */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Pesquisar por NIF, cliente ou nº..."
              value={searchNif}
              onChange={(e) => setSearchNif(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Estado Fiscal */}
          <div>
            <select
              value={fiscalFilter}
              onChange={(e) => setFiscalFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">Todos os Estados Fiscais</option>
              <option value="emitido">Fatura Emitida (AT)</option>
              <option value="pendente">Faturação Pendente</option>
              <option value="anulado">Anulada / Retificada</option>
            </select>
          </div>

          {/* Tipo de Venda */}
          <div>
            <select
              value={saleTypeFilter}
              onChange={(e) => setSaleTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">Todos os Tipos de Serviço</option>
              <option value="dine_in">Consumo no Local</option>
              <option value="takeaway">Levantamento</option>
              <option value="delivery">Entrega</option>
            </select>
          </div>

          {/* Meio de Pagamento */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">Todas as Formas de Pagamento</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão / Multibanco</option>
              <option value="mbway">MB WAY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            <span>A carregar lista de vendas...</span>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Nenhuma venda registada com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Registo / Data</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">NIF</th>
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Estado Fiscal</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block">{sale.receiptNumber}</span>
                      <span className="text-[11px] text-stone-500">{formatDateTime(sale.createdAt)}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {sale.customer?.name || 'Consumidor Final'}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {sale.customer?.nif || '999999990'}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {getSaleTypeLabel(sale.saleType)}
                      {sale.tableNumber && (
                        <span className="block text-[10px] text-stone-500">Mesa: {sale.tableNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sale.payments.map((p, idx) => (
                        <span key={idx} className="block text-stone-700">
                          {getPaymentMethodLabel(p.method)} ({formatCurrency(p.amount)})
                        </span>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-stone-950 font-mono text-sm">
                      {formatCurrency(sale.totals.finalTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.fiscalStatus === 'emitido' ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <FileCheck className="w-3 h-3" />
                          <span>{sale.fiscalDocumentNumber || 'Emitido'}</span>
                        </div>
                      ) : sale.fiscalStatus === 'pendente' ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pendente</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>Anulado</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSaleDetail(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DA VENDA */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">
                  Detalhes do Pedido {selectedSale.receiptNumber}
                </h3>
                <span className="text-[11px] text-stone-400">
                  {formatDateTime(selectedSale.createdAt)} &bull; Operador: {selectedSale.operatorName}
                </span>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Notificação de Reemissão */}
              {retryMessage && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{retryMessage}</span>
                </div>
              )}

              {/* Status Fiscal da Venda */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-700 block">Estado Fiscal:</span>
                  <span className="text-stone-500">
                    {selectedSale.fiscalStatus === 'emitido'
                      ? `Fatura oficial emitida: ${selectedSale.fiscalDocumentNumber}`
                      : selectedSale.fiscalStatus === 'pendente'
                      ? 'Faturação pendente (documento oficial não emitido)'
                      : 'Venda anulada / retificada por Nota de Crédito'}
                  </span>
                </div>

                {selectedSale.fiscalStatus === 'pendente' && (
                  <button
                    onClick={() => handleRetryEmission(selectedSale)}
                    disabled={isRetrying}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isRetrying ? 'A emitir...' : 'Emitir Fatura Agora'}</span>
                  </button>
                )}
              </div>

              {/* Cliente */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="font-bold text-stone-700 block mb-1">Adquirente:</span>
                <p className="font-semibold text-stone-900">{selectedSale.customer?.name}</p>
                <p className="font-mono text-stone-600">NIF: {selectedSale.customer?.nif}</p>
                {selectedSale.customer?.address && (
                  <p className="text-stone-500">{selectedSale.customer.address}</p>
                )}
              </div>

              {/* Itens do Pedido */}
              <div>
                <span className="font-bold text-stone-700 block mb-2">Produtos Registados:</span>
                <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                  {selectedSale.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-stone-900">{it.productName}</span>
                        <div className="text-[11px] text-stone-500">
                          {it.quantity} x {formatCurrency(it.unitPrice)} &bull; IVA {it.ivaRate}%
                        </div>
                      </div>
                      <span className="font-bold text-stone-950 font-mono">
                        {formatCurrency(it.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais & Resumo de IVA */}
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Incidência Total:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.totals.netTotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total IVA:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.totals.taxTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-stone-950 pt-1 border-t border-stone-200">
                  <span>TOTAL FINAL:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.totals.finalTotal)}</span>
                </div>
              </div>

              {/* Botão para visualizar talão se emitido */}
              {relatedFiscalDoc && (
                <button
                  onClick={() => setTicketModalDoc(relatedFiscalDoc)}
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Talão Fiscal Oficial ({relatedFiscalDoc.documentNumber})</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalDoc && (
        <InvoiceTicketModal
          document={ticketModalDoc}
          company={company}
          currentUser={currentUser}
          onClose={() => setTicketModalDoc(null)}
        />
      )}
    </div>
  );
};
