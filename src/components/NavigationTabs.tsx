import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  FileText,
  Utensils,
  Users,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Grid,
  X,
  Check,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'invoices'
  | 'products'
  | 'customers'
  | 'cash'
  | 'reports'
  | 'settings';

interface NavigationTabsProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingInvoicesCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentTab,
  onTabChange,
  pendingInvoicesCount,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const tabs = [
    { id: 'dashboard', label: 'Painel', shortLabel: 'Painel', icon: LayoutDashboard },
    { id: 'pos', label: 'Nova Venda (PDV)', shortLabel: 'PDV', icon: ShoppingCart },
    { id: 'sales', label: 'Vendas', shortLabel: 'Vendas', icon: Receipt },
    {
      id: 'invoices',
      label: 'Notas Fiscais',
      shortLabel: 'Notas',
      icon: FileText,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined,
    },
    { id: 'products', label: 'Produtos', shortLabel: 'Produtos', icon: Utensils },
    { id: 'customers', label: 'Clientes', shortLabel: 'Clientes', icon: Users },
    { id: 'cash', label: 'Caixa', shortLabel: 'Caixa', icon: Wallet },
    { id: 'reports', label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', shortLabel: 'Configurações', icon: Settings },
  ];

  // Auto-scroll active tab into view whenever currentTab changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentTab]);

  const handleSelectTab = (tabId: NavTab) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -160, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  const currentTabObj = tabs.find((t) => t.id === currentTab) || tabs[0];
  const CurrentIcon = currentTabObj.icon;

  return (
    <>
      <nav className="relative bg-white border-b border-stone-200 shadow-xs z-30 select-none">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 py-1.5 sm:py-2">
            
            {/* Botão de Atalho Mobile: Todas as 9 Abas */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 shrink-0 cursor-pointer active:scale-95 transition-all"
              title="Abrir lista completa de abas"
            >
              <Grid className="w-4 h-4 text-stone-700" />
              <span className="hidden xs:inline">Todas as Abas</span>
            </button>

            {/* Botão scroll esquerdo (Desktop/Tablet) */}
            <button
              onClick={scrollLeft}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors shrink-0"
              aria-label="Rolar abas para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Container rolável com indicador de toque suave */}
            <div
              ref={scrollContainerRef}
              className="flex-1 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none no-scrollbar scroll-smooth py-0.5"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={isActive ? activeTabRef : null}
                    onClick={() => handleSelectTab(tab.id as NavTab)}
                    className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-600/30'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-stone-950 stroke-[2.5]' : 'text-stone-500'}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botão scroll direito (Desktop/Tablet) */}
            <button
              onClick={scrollRight}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors shrink-0"
              aria-label="Rolar abas para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* MODAL / GAVETA MOBILE DE TODAS AS ABAS */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200">
            {/* Topo do Menu Mobile */}
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Navegação do Sistema</h3>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grade de Abas Completa para Mobile */}
            <div className="p-4 overflow-y-auto space-y-1.5 text-xs">
              <p className="text-[11px] text-stone-500 font-medium mb-2 px-1">
                Selecione qualquer módulo para navegar diretamente:
              </p>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id as NavTab)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-stone-950 text-amber-400' : 'bg-white text-stone-700 border border-stone-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold truncate">{tab.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {tab.badge && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                            {tab.badge}
                          </span>
                        )}
                        {isActive && <Check className="w-4 h-4 text-stone-950" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
