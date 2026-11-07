import React from 'react';
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
  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'pos', label: 'Nova Venda (PDV)', icon: ShoppingCart },
    { id: 'sales', label: 'Vendas', icon: Receipt },
    {
      id: 'invoices',
      label: 'Notas Fiscais',
      icon: FileText,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined,
    },
    { id: 'products', label: 'Produtos', icon: Utensils },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'cash', label: 'Caixa', icon: Wallet },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-stone-200 shadow-xs overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 py-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as NavTab)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
