import React, { useState, useEffect } from 'react';
import { CompanyInfo, User, CashShift } from './types';
import { api } from './lib/api';
import { localStore } from './lib/localStore';
import { Navbar } from './components/Navbar';
import { NavigationTabs, NavTab } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { SalesView } from './components/SalesView';
import { InvoicesView } from './components/InvoicesView';
import { ProductsView } from './components/ProductsView';
import { CustomersView } from './components/CustomersView';
import { CashRegisterView } from './components/CashRegisterView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { RefreshCw, MapPin } from 'lucide-react';
import { APP_CONFIG } from './lib/config';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState<number>(0);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDirectStartButton, setShowDirectStartButton] = useState<boolean>(false);

  const initLocalFallback = () => {
    const fallbackCompany = localStore.getCompany();
    const fallbackUsers = localStore.getUsers();
    const fallbackShift = localStore.getCurrentShift();
    const dash = localStore.getDashboardReport();

    setCompany(fallbackCompany);
    setUsers(fallbackUsers);
    setCurrentUser(fallbackUsers[0]);
    setActiveShift(fallbackShift);
    setPendingInvoicesCount(dash.pendingCount || 0);
    setIsLocalMode(true);
    setLoading(false);
  };

  const loadInitialData = async () => {
    try {
      const [comp, uList, curShift, dashReport] = await Promise.all([
        api.getCompany(),
        api.getUsers(),
        api.getCurrentShift(),
        api.getDashboardReport(),
      ]);

      const validCompany = comp && comp.name ? comp : localStore.getCompany();
      const validUsers = uList && uList.length > 0 ? uList : localStore.getUsers();

      setCompany(validCompany);
      setUsers(validUsers);
      if (validUsers.length > 0 && (!currentUser || !validUsers.some((u) => u.id === currentUser.id))) {
        setCurrentUser(validUsers[0]);
      }
      setActiveShift(curShift);
      if (dashReport) {
        setPendingInvoicesCount(dashReport.pendingCount || 0);
      }
      setIsLocalMode(api.isLocalMode());
    } catch (err) {
      console.warn('Iniciando em modo contingência / LocalStore:', err);
      initLocalFallback();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Se em 1.5s não carregou, exibe botão para entrar direto e força inicialização aos 2.5s
    const buttonTimer = setTimeout(() => {
      setShowDirectStartButton(true);
    }, 1200);

    const safetyTimer = setTimeout(() => {
      if (!company || !currentUser) {
        console.warn('Timeout de segurança acionado: forçando carregamento local.');
        initLocalFallback();
      }
    }, 2200);

    return () => {
      clearTimeout(buttonTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const refreshShiftAndMetrics = async () => {
    try {
      const [curShift, dashReport] = await Promise.all([
        api.getCurrentShift(),
        api.getDashboardReport(),
      ]);
      setActiveShift(curShift);
      if (dashReport) {
        setPendingInvoicesCount(dashReport.pendingCount || 0);
      }
    } catch (err) {
      console.error('Erro ao atualizar métricas:', err);
    }
  };

  if (loading || !company || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-900 text-stone-100">
        <div className="flex flex-col items-center gap-3 max-w-sm px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg">
            ASSX
          </div>
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-xs font-semibold text-stone-300">
            Iniciando sistema {APP_CONFIG.appName}...
          </span>

          {showDirectStartButton && (
            <button
              onClick={() => initLocalFallback()}
              className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition-all animate-in fade-in cursor-pointer"
            >
              Iniciar no Navegador (Modo Offline / Netlify)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 font-sans">
      {/* Barra de Topo */}
      <div className="print:hidden">
        <Navbar
          currentUser={currentUser}
          users={users}
          onSelectUser={(u) => setCurrentUser(u)}
          activeShift={activeShift}
          onNavigateToPOS={() => setCurrentTab('pos')}
          onNavigateToShift={() => setCurrentTab('cash')}
          pendingInvoicesCount={pendingInvoicesCount}
          onNavigateToInvoices={() => setCurrentTab('invoices')}
          company={company}
        />

        {/* Navegação por Separadores */}
        <NavigationTabs
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          pendingInvoicesCount={pendingInvoicesCount}
        />
      </div>

      {/* Área de Conteúdo Principal */}
      <main className={currentTab === 'pos' ? 'flex-1 w-full mx-auto p-2 sm:p-3 max-w-[1800px] print:p-0' : 'flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none'}>
        {currentTab === 'dashboard' && (
          <DashboardView
            company={company}
            currentUser={currentUser.name}
            onStartSale={() => setCurrentTab('pos')}
            onOpenCash={() => setCurrentTab('cash')}
            onViewPendingInvoices={() => setCurrentTab('invoices')}
          />
        )}

        {currentTab === 'pos' && (
          <PosView
            company={company}
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
            onSaleCompleted={refreshShiftAndMetrics}
          />
        )}

        {currentTab === 'sales' && (
          <SalesView
            company={company}
            currentUser={currentUser.name}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesView
            company={company}
            currentUser={currentUser.name}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
          />
        )}

        {currentTab === 'cash' && (
          <CashRegisterView
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
            onShiftStatusChanged={refreshShiftAndMetrics}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            company={company}
            currentUser={currentUser.name}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
            onCompanyUpdated={(c) => setCompany(c)}
          />
        )}
      </main>

      {/* Rodapé Institucional com Endereço Demonstrativo de São Paulo */}
      <footer className="bg-white border-t border-stone-200 py-3 text-stone-500 text-[11px] print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; 2026 <strong>{APP_CONFIG.appName}</strong> &bull; {APP_CONFIG.company.legalName} &bull; {APP_CONFIG.demoAddress.formatted} <span className="text-[10px] text-stone-400">({APP_CONFIG.demoAddress.notice})</span>
          </span>
          <span className="flex items-center gap-2 font-medium text-stone-600">
            {isLocalMode ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-750 border border-amber-200 text-[10px] font-semibold" title="Funcionando em modo autônomo no navegador (Netlify/Offline). Dados salvos localmente.">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Modo Local / Netlify (Dados no Navegador)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Servidor Online</span>
              </span>
            )}
            <span>Sistema Operacional de Vendas &amp; PDV</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
