import { User, CashShift, CompanyInfo } from '../types';
import {
  Sparkles,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Wallet,
  User as UserIcon,
} from 'lucide-react';
import { APP_CONFIG } from '../lib/config';

interface NavbarProps {
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  activeShift: CashShift | null;
  onNavigateToPOS: () => void;
  onNavigateToShift: () => void;
  pendingInvoicesCount: number;
  onNavigateToInvoices: () => void;
  company?: CompanyInfo | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  onSelectUser,
  activeShift,
  onNavigateToPOS,
  onNavigateToShift,
  pendingInvoicesCount,
  onNavigateToInvoices,
  company,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Marca / Identidade Oficial AX Tech PDV */}
          <div className="flex items-center gap-3">
            {company?.logoUrl ? (
              <div className="flex items-center gap-2.5">
                <img
                  src={company.logoUrl}
                  alt={APP_CONFIG.appName}
                  className="h-10 sm:h-12 w-auto max-w-[170px] sm:max-w-[230px] object-contain drop-shadow-md"
                />
                <span className="hidden xl:inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700">
                  POS &amp; Gestão
                </span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20 font-black overflow-hidden border border-amber-500/30">
                  <span className="text-xs font-black tracking-tighter">ASSX</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base tracking-tight text-white">
                      {APP_CONFIG.appName}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700">
                      POS &amp; Gestão
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    São Paulo - SP &bull; CNPJ {APP_CONFIG.company.cnpj}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Indicadores de Estado & Ações Rápidas */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Estado de Caixa */}
            <button
              onClick={onNavigateToShift}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeShift
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/80 animate-pulse'
              }`}
              title="Clique para gerenciar a sessão de caixa"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {activeShift ? `Caixa #${activeShift.shiftNumber} Aberto` : 'Caixa Fechado'}
              </span>
              <span className="md:hidden">
                {activeShift ? `#${activeShift.shiftNumber}` : 'Fechado'}
              </span>
            </button>

            {/* Faturamento / Alerta Pendente */}
            {pendingInvoicesCount > 0 ? (
              <button
                onClick={onNavigateToInvoices}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 border border-rose-600 text-rose-300 hover:bg-rose-900 transition-colors animate-pulse"
                title={`${pendingInvoicesCount} notas pendentes de emissão fiscal`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{pendingInvoicesCount} Pendente{pendingInvoicesCount > 1 ? 's' : ''}</span>
              </button>
            ) : (
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-stone-800/80 border border-stone-700/60 text-stone-300"
                title="Módulo Fiscal ASSX Tech operacional"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Módulo Fiscal Ativo</span>
              </div>
            )}

            {/* Botão Principal: Nova Venda (Sempre Destacado) */}
            <button
              onClick={onNavigateToPOS}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-stone-950 stroke-[2.5]" />
              <span className="tracking-wide">Nova Venda</span>
            </button>

            {/* Seletor de Operador / Perfil */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-stone-800">
              <UserIcon className="w-4 h-4 text-stone-400" />
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find((item) => item.id === e.target.value);
                  if (u) onSelectUser(u);
                }}
                className="bg-stone-800 text-stone-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-stone-700 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
                title="Trocar operador ativo"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : 'Operador'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
