import React, { useState, useEffect } from 'react';
import { CashShift, CashMovement } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Printer,
  X,
  PlusCircle,
} from 'lucide-react';

interface CashRegisterViewProps {
  currentUser: { id: string; name: string; role: 'admin' | 'operador' };
  onShiftStatusChanged?: () => void;
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({
  currentUser,
  onShiftStatusChanged,
}) => {
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Abertura
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('150.00');

  // Modal de Movimento (Entrada / Sangria)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida' | 'sangria'>('entrada');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Modal de Fecho de Caixa
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Relatório Z / Visualização de turno anterior
  const [inspectShift, setInspectShift] = useState<CashShift | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cur, hist] = await Promise.all([api.getCurrentShift(), api.getShifts()]);
      setActiveShift(cur);
      setShiftsHistory(hist);
    } catch (err) {
      console.error('Erro ao carregar sessão de caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingAmount.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Introduza um valor válido para o fundo inicial.');
      return;
    }

    try {
      await api.openShift(val, currentUser.name);
      setIsOpeningModalOpen(false);
      loadData();
      if (onShiftStatusChanged) onShiftStatusChanged();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movementAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Introduza um montante válido.');
      return;
    }
    if (!movementReason.trim()) {
      alert('É obrigatório justificar o motivo do movimento.');
      return;
    }

    try {
      await api.addShiftMovement(movementType, val, movementReason, currentUser.name);
      setIsMovementModalOpen(false);
      setMovementAmount('');
      setMovementReason('');
      loadData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(countedCash.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Introduza o montante de dinheiro contado em caixa.');
      return;
    }

    try {
      await api.closeShift(val, closingNotes, currentUser.name);
      setIsClosingModalOpen(false);
      setCountedCash('');
      setClosingNotes('');
      loadData();
      if (onShiftStatusChanged) onShiftStatusChanged();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Gestão de Caixa &amp; Fecho Diário
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Abertura, registo de sangrias/entradas de troco e reconciliação cega de fecho.
          </p>
        </div>

        {activeShift ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovementType('entrada');
                setIsMovementModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors"
            >
              + Entrada de Trocos
            </button>
            <button
              onClick={() => {
                setMovementType('sangria');
                setIsMovementModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors"
            >
              - Saída / Sangria
            </button>
            <button
              onClick={() => setIsClosingModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-xs"
            >
              Fechar Caixa
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Nova Caixa</span>
          </button>
        )}
      </div>

      {/* SESSÃO ATUAL DE CAIXA */}
      {activeShift ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Resumo da Sessão */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Sessão Ativa
                </span>
                <h3 className="text-lg font-black text-stone-900">
                  Turno de Balcão #{activeShift.shiftNumber}
                </h3>
              </div>
              <div className="text-right text-xs text-stone-500">
                <span>Aberta em: <strong>{formatDateTime(activeShift.openedAt)}</strong></span>
                <span className="block text-[11px]">Por: {activeShift.openedBy}</span>
              </div>
            </div>

            {/* Balanço em Dinheiro Físico */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs text-stone-500 font-semibold block">Fundo Inicial de Maneio:</span>
                <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                  {formatCurrency(activeShift.openingAmount)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-800 font-semibold block">Dinheiro Esperado em Gaveta:</span>
                <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">
                  {formatCurrency(activeShift.expectedCashAmount)}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Fundo + Vendas em Dinheiro + Entradas - Sangrias
                </span>
              </div>
            </div>

            {/* Totais do Turno por Forma de Pagamento */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Recebimentos Deste Turno
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Dinheiro:</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {formatCurrency(activeShift.totals.dinheiro)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Multibanco:</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {formatCurrency(activeShift.totals.cartao)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">MB WAY:</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    {formatCurrency(activeShift.totals.mbway)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Movimentos de Caixa (Entradas & Sangrias) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Movimentos Manuais de Dinheiro
                </h4>
                <span className="text-[11px] text-stone-500 font-medium">
                  {activeShift.movements.length} movimentos
                </span>
              </div>

              {activeShift.movements.length === 0 ? (
                <div className="py-10 text-center text-stone-400 text-xs">
                  Nenhuma sangria ou entrada registada nesta sessão.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                  {activeShift.movements.map((mov) => (
                    <div key={mov.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          mov.type === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {mov.type === 'entrada' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 block">{mov.reason}</span>
                          <span className="text-[10px] text-stone-500">{formatDateTime(mov.timestamp)} &bull; {mov.operatorName}</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${mov.type === 'entrada' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {mov.type === 'entrada' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-500">
              * Conforme a legislação financeira, movimentos manuais não podem ser eliminados, ficando permanentemente auditados.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-amber-950">
            Nenhuma Caixa Aberta no Momento
          </h3>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Para iniciar o registo de vendas com controlo rigoroso de numerário e reconciliação diária, abra um novo turno com o valor do fundo de maneio inicial.
          </p>
          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* HISTÓRICO DE SESSÕES FECHADAS */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Histórico de Sessões Fechadas (Fechos de Caixa)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Turno</th>
                <th className="py-3 px-4">Abertura</th>
                <th className="py-3 px-4">Fecho</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4 text-right">Fundo Inicial</th>
                <th className="py-3 px-4 text-right">Faturado</th>
                <th className="py-3 px-4 text-right">Contado em Caixa</th>
                <th className="py-3 px-4 text-right">Diferença</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shiftsHistory.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-stone-900">
                    #{s.shiftNumber}
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    {formatDateTime(s.openedAt)}
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    {s.closedAt ? formatDateTime(s.closedAt) : 'Em curso...'}
                  </td>
                  <td className="py-3 px-4 text-stone-800">
                    {s.openedBy}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatCurrency(s.openingAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {formatCurrency(s.totals.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {s.closingCountedAmount !== undefined ? formatCurrency(s.closingCountedAmount) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {s.difference !== undefined ? (
                      <span className={s.difference === 0 ? 'text-emerald-700' : s.difference > 0 ? 'text-blue-700' : 'text-rose-700'}>
                        {s.difference > 0 ? '+' : ''}{formatCurrency(s.difference)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'aberta' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ABERTURA */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Abertura de Sessão de Caixa</h4>
              <button onClick={() => setIsOpeningModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleOpenShift} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Fundo Inicial de Troco (R$):
                </label>
                <input
                  type="text"
                  required
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Valor físico em dinheiro depositado na gaveta para iniciar a operação.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ENTRADA / SANGRIA */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm capitalize">
                {movementType === 'entrada' ? 'Entrada Manual de Dinheiro' : 'Saída / Sangria de Caixa'}
              </h4>
              <button onClick={() => setIsMovementModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMovement} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Valor (R$):</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 50.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Motivo Justificativo (Obrigatório):</label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'entrada' ? 'Ex: Reforço de moedas pelo gerente' : 'Ex: Sangria para cofre / pagamento urgente a fornecedor'}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
                >
                  Registar Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FECHO DE CAIXA */}
      {isClosingModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Fecho de Caixa #{activeShift.shiftNumber}</h4>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCloseShift} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-600">Dinheiro Calculado pelo Sistema:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {formatCurrency(activeShift.expectedCashAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Total Faturado no Turno:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {formatCurrency(activeShift.totals.totalRevenue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Dinheiro Físico Contado na Gaveta (R$):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Informe o valor total de notas e moedas contadas"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Observações do Fecho (Opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Justifique eventuais quebras de caixa ou observações..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirmar e Trancar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
