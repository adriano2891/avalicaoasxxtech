import React, { useState, useEffect } from 'react';
import { FiscalDocument, CompanyInfo } from '../types';
import { api } from '../lib/api';
import {
  formatCurrency,
  formatDateTime,
  getDocumentTypeLabel,
  getDocumentTypeBadgeColor,
} from '../lib/formatters';
import {
  FileText,
  Printer,
  Mail,
  AlertOctagon,
  Eye,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  X,
  ShieldCheck,
  FileX,
} from 'lucide-react';
import { InvoiceTicketModal } from './InvoiceTicketModal';

interface InvoicesViewProps {
  company: CompanyInfo;
  currentUser: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ company, currentUser }) => {
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Talão
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);

  // Modal de Nota de Crédito Retificativa
  const [ncTargetDoc, setNcTargetDoc] = useState<FiscalDocument | null>(null);
  const [ncReason, setNcReason] = useState('');
  const [isSubmittingNc, setIsSubmittingNc] = useState(false);
  const [ncMessage, setNcMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const list = await api.getFiscalDocuments();
      setDocuments(list);
    } catch (err) {
      console.error('Erro ao carregar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    if (selectedType !== 'all' && doc.documentType !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = doc.documentNumber.toLowerCase().includes(q);
      const matchNif = doc.customerNif.includes(q);
      const matchName = doc.customerName.toLowerCase().includes(q);
      const matchAtcud = doc.atcud.toLowerCase().includes(q);
      return matchNumber || matchNif || matchName || matchAtcud;
    }
    return true;
  });

  const handleEmitCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncTargetDoc || !ncReason.trim()) return;

    setIsSubmittingNc(true);
    setNcMessage(null);

    try {
      const res = await api.emitCreditNote(ncTargetDoc.id, ncReason, currentUser);
      if (res.success && res.creditNote) {
        setNcMessage({
          type: 'success',
          text: `Nota de Crédito ${res.creditNote.documentNumber} emitida com sucesso via certificador AT.`,
        });
        setNcTargetDoc(null);
        setNcReason('');
        loadDocuments();
      } else {
        setNcMessage({
          type: 'error',
          text: res.error || 'Erro ao comunicar com a API para emissão da Nota de Crédito.',
        });
      }
    } catch (err: any) {
      setNcMessage({
        type: 'error',
        text: `Falha: ${err.message || 'Erro no servidor'}`,
      });
    } finally {
      setIsSubmittingNc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Documentos Fiscais Emitidos
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Certificação AT #2230
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Faturas Simplificadas (FS), Faturas (FT), Faturas-Recibo (FR) e Notas de Crédito (NC).
          </p>
        </div>

        <button
          onClick={loadDocuments}
          className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Notificação de Sucesso/Erro de Nota de Crédito */}
      {ncMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            ncMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {ncMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{ncMessage.text}</span>
          </div>
          <button onClick={() => setNcMessage(null)} className="text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          {/* Pesquisa */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Pesquisar por número (ex: FS 2026/0001), NIF ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Tipo de Documento */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'FS', label: 'Faturas Simplificadas' },
              { id: 'FT', label: 'Faturas' },
              { id: 'FR', label: 'Faturas-Recibo' },
              { id: 'NC', label: 'Notas de Crédito' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedType === t.id
                    ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            <span>A carregar documentos fiscais emitidos...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Nenhum documento fiscal encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Número Documento</th>
                  <th className="py-3 px-4">Data/Hora Emissão</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">NIF</th>
                  <th className="py-3 px-4">ATCUD</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDocumentTypeBadgeColor(doc.documentType)}`}>
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">
                      {doc.documentNumber}
                      {doc.printCount > 1 && (
                        <span className="block text-[9px] text-stone-500 font-sans">
                          {doc.printCount} impressões (2ª via)
                        </span>
                      )}
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
                    <td className="py-3 px-4 font-mono text-[10px] text-stone-600">
                      {doc.atcud}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-stone-950 font-mono text-sm">
                      {doc.documentType === 'NC' ? '-' : ''}{formatCurrency(doc.totals.finalTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'emitido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doc.status.toUpperCase()}
                      </span>
                      {doc.rectifiedByNC && (
                        <span className="block text-[9px] text-red-700 font-semibold mt-0.5">
                          Por: {doc.rectifiedByNC}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {/* Ver Talão / 2ª via */}
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors"
                        title="Ver e Imprimir 2ª Via do Documento"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Talão</span>
                      </button>

                      {/* Emitir Nota de Crédito se ainda não foi retificado */}
                      {doc.documentType !== 'NC' && doc.status === 'emitido' && (
                        <button
                          onClick={() => setNcTargetDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                          title="Emitir Nota de Crédito Retificativa (Não é permitido apagar faturas emitidas)"
                        >
                          <FileX className="w-3.5 h-3.5" />
                          <span>Retificar (NC)</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EMISSÃO DE NOTA DE CRÉDITO (DOCUMENTO RETIFICATIVO AT) */}
      {ncTargetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Emitir Nota de Crédito Retificativa
                </h3>
                <p className="text-xs text-stone-400">
                  A retificar o documento {ncTargetDoc.documentNumber} ({formatCurrency(ncTargetDoc.totals.finalTotal)})
                </p>
              </div>
              <button onClick={() => setNcTargetDoc(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmitCreditNote} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                <strong>Enquadramento Legal (Art. 29º do CIVA):</strong>
                <p className="mt-1">
                  Os documentos fiscais emitidos e comunicados à Autoridade Tributária não podem ser editados nem apagados.
                  A anulação é efetuada mediante a emissão de uma <strong>Nota de Crédito oficial (NC)</strong> com comunicação à AT e aposição de novo ATCUD.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Motivo da Emissão da Nota de Crédito (Obrigatório por Lei):
                </label>
                <textarea
                  required
                  rows={3}
                  value={ncReason}
                  onChange={(e) => setNcReason(e.target.value)}
                  placeholder="Ex: Devolução de pedido por indisponibilidade de mesa / Correção de NIF de adquirente / Desistência..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setNcTargetDoc(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNc || !ncReason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingNc ? 'A emitir NC...' : 'Emitir Nota de Crédito Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Talão Oficial */}
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
