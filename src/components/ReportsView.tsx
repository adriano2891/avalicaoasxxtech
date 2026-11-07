import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { CompanyInfo } from '../types';
import {
  Download,
  Printer,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building2,
  UserCheck,
} from 'lucide-react';

interface ReportsViewProps {
  company?: CompanyInfo | null;
  currentUser?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ company, currentUser = 'Administrador' }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.getDetailedReport(period);
      setReportData(data);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [period]);

  const getPeriodLabel = (p: 'today' | 'week' | 'month') => {
    switch (p) {
      case 'today':
        return `Hoje (${new Date().toLocaleDateString('pt-BR')})`;
      case 'week':
        return 'Últimos 7 Dias';
      case 'month':
        return `Este Mês (${new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())})`;
      default:
        return 'Período Atual';
    }
  };

  const handlePrint = () => {
    // Garante que o modo de talão térmico não esteja ativo no body
    document.body.classList.remove('print-receipt-mode');
    setIsPrinting(true);

    // Timeout para renderização completa e abertura do diálogo nativo de impressão
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  const handleExportCsv = () => {
    api.exportSalesCsv(period);
  };

  return (
    <div className="space-y-6 printable-report-container">
      {/* =========================================================================
          CABEÇALHO EXCLUSIVO PARA IMPRESSÃO (NÃO APARECE NA TELA, APARECE NA IMPRESSÃO/PDF)
          ========================================================================= */}
      <div className="hidden print:block border-b-2 border-stone-800 pb-4 mb-5 text-stone-900">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="font-black text-xl tracking-tight uppercase text-stone-950">
              {company?.name || company?.legalName || 'ASSX Tech - Sabores & Nações'}
            </h1>
            <p className="text-xs font-semibold text-stone-700">
              Relatório Operacional de Gestão &amp; Vendas
            </p>
            <p className="text-[11px] text-stone-600">
              {company?.address || 'Av. Paulista, 1000 - São Paulo - SP'} &bull; NIF/CNPJ: {company?.nif || '509123456'}
            </p>
            {company?.phone && (
              <p className="text-[10px] text-stone-500">
                Contacto: {company.phone} {company.email ? `• ${company.email}` : ''}
              </p>
            )}
          </div>

          <div className="text-right text-xs space-y-1">
            <span className="inline-block px-2 py-0.5 bg-stone-100 border border-stone-400 font-bold uppercase tracking-wider rounded text-[10px]">
              Controlo Interno
            </span>
            <div className="text-stone-700 text-[11px]">
              Período: <strong>{getPeriodLabel(period)}</strong>
            </div>
            <div className="text-stone-500 text-[10px]">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-stone-500 text-[10px]">
              Operador: <strong>{currentUser}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Header em Tela (Ocultado durante impressão) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Relatórios Operacionais de Restauração
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Análise de receitas, produtos mais consumidos, canais de venda e impostos discriminados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Seletor de Período */}
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'today' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'week' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Últimos 7 Dias
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'month' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Este Mês
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            title="Exportar dados do relatório em formato CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting || loading}
            title="Imprimir relatório operacional ou salvar como PDF"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-pulse' : ''}`} />
            <span>{isPrinting ? 'A preparar...' : 'Imprimir'}</span>
          </button>
        </div>
      </div>

      {/* AVISO LEGAL OBRIGATÓRIO (NÃO SUBSTITUI DOCUMENTOS FISCAIS OFICIAIS) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs print:bg-stone-50 print:border-stone-300 print:text-stone-800 print:p-2.5 print:my-2 print-avoid-break">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 print:w-4 print:h-4" />
        <div className="leading-relaxed">
          <strong className="block font-bold">Aviso Legal &amp; Fiscal:</strong>
          Os resumos e relatórios analíticos gerados nesta aplicação destinam-se exclusivamente ao controlo operacional interno do restaurante.
          Estes relatórios <strong>não substituem</strong> os mapas fiscais oficiais, as guias de IVA nem o ficheiro SAF-T (PT) emitido pelo programa de faturação certificado pela Autoridade Tributária.
        </div>
      </div>

      {loading && !reportData ? (
        <div className="p-12 text-center text-stone-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
          <span>A calcular relatórios estatísticos...</span>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3 print-avoid-break">
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-3">
              <span className="text-xs font-semibold text-stone-500 uppercase">Receita Total ({getPeriodLabel(period)})</span>
              <div className="text-2xl font-black text-stone-900 font-mono mt-2 print:text-xl">
                {formatCurrency(reportData.grandTotal)}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-3">
              <span className="text-xs font-semibold text-stone-500 uppercase">Total de Pedidos Registados</span>
              <div className="text-2xl font-black text-stone-900 font-mono mt-2 print:text-xl">
                {reportData.salesCount} <span className="text-sm font-semibold text-stone-500">vendas</span>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-3">
              <span className="text-xs font-semibold text-stone-500 uppercase">Ticket Médio</span>
              <div className="text-2xl font-black text-stone-900 font-mono mt-2 print:text-xl">
                {formatCurrency(reportData.salesCount > 0 ? reportData.grandTotal / reportData.salesCount : 0)}
              </div>
            </div>
          </div>

          {/* Resumo de Tributos Discriminado por Alíquota */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-4 print-avoid-break">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
              Detalhamento de Tributos e Alíquotas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-stone-200 print:border-stone-300 min-w-[500px]">
                <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200 print:bg-stone-100 print:border-stone-300">
                  <tr>
                    <th className="py-2.5 px-4">Alíquota Aplicável</th>
                    <th className="py-2.5 px-4 text-right">Base de Cálculo</th>
                    <th className="py-2.5 px-4 text-right">Tributo Apurado</th>
                    <th className="py-2.5 px-4 text-right">Total com Impostos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono print:divide-stone-200">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-stone-900">
                      Taxa Intermédia (13%) - Restauração
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(reportData.taxBreakdown.int13.base)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 print:text-stone-900">{formatCurrency(reportData.taxBreakdown.int13.amount)}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{formatCurrency(reportData.taxBreakdown.int13.base + reportData.taxBreakdown.int13.amount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-stone-900">
                      Taxa Reduzida (6%) - Bens Essenciais
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(reportData.taxBreakdown.red6.base)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 print:text-stone-900">{formatCurrency(reportData.taxBreakdown.red6.amount)}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{formatCurrency(reportData.taxBreakdown.red6.base + reportData.taxBreakdown.red6.amount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-stone-900">
                      Taxa Normal (23%)
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(reportData.taxBreakdown.nor23.base)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 print:text-stone-900">{formatCurrency(reportData.taxBreakdown.nor23.amount)}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{formatCurrency(reportData.taxBreakdown.nor23.base + reportData.taxBreakdown.nor23.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            {/* Top Produtos */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-4 print-avoid-break">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
                Pratos &amp; Bebidas Mais Vendidos
              </h3>
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto text-xs print:max-h-none print:overflow-visible print:divide-stone-200">
                {reportData.productBreakdown && reportData.productBreakdown.length > 0 ? (
                  reportData.productBreakdown.slice(0, 10).map((p: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-stone-900">{p.name}</span>
                        <span className="text-[11px] text-stone-500 block">{p.quantity} unidades servidas</span>
                      </div>
                      <span className="font-mono font-bold text-stone-950">{formatCurrency(p.total)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-xs py-3">Nenhum produto registrado no período.</p>
                )}
              </div>
            </div>

            {/* Vendas por Tipo de Serviço */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs print:border-stone-300 print:p-4 print-avoid-break">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
                Canais de Venda / Tipo de Serviço
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center print:bg-white print:border-stone-300">
                  <span className="font-semibold text-stone-800">Consumo no Local (Restaurante):</span>
                  <span className="font-mono font-bold text-stone-950">{formatCurrency(reportData.serviceStats?.dine_in || 0)}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center print:bg-white print:border-stone-300">
                  <span className="font-semibold text-stone-800">Levantamento (Takeaway):</span>
                  <span className="font-mono font-bold text-stone-950">{formatCurrency(reportData.serviceStats?.takeaway || 0)}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center print:bg-white print:border-stone-300">
                  <span className="font-semibold text-stone-800">Entrega ao Domicílio:</span>
                  <span className="font-mono font-bold text-stone-950">{formatCurrency(reportData.serviceStats?.delivery || 0)}</span>
                </div>
              </div>

              {/* Vendas por Operador */}
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mt-5 mb-2">
                Desempenho por Operador
              </h4>
              <div className="divide-y divide-stone-100 text-xs print:divide-stone-200">
                {reportData.operatorBreakdown && reportData.operatorBreakdown.length > 0 ? (
                  reportData.operatorBreakdown.map((op: any, idx: number) => (
                    <div key={idx} className="py-1.5 flex justify-between items-center">
                      <span className="font-medium text-stone-800">{op.name} ({op.count} pedidos)</span>
                      <span className="font-mono font-bold">{formatCurrency(op.total)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-xs py-2">Sem vendas associadas a operadores no período.</p>
                )}
              </div>
            </div>
          </div>

          {/* RODAPÉ EXCLUSIVO PARA IMPRESSÃO */}
          <div className="hidden print:flex items-center justify-between text-[10px] text-stone-500 pt-4 mt-6 border-t border-stone-300">
            <span>ASSX Tech PDV &bull; {company?.name || 'Sabores & Nações'}</span>
            <span>Relatório de Controlo Operacional Interno &bull; Pág. 1 de 1</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
