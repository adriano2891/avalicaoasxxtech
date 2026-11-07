import React, { useState, useEffect } from 'react';
import { CompanyInfo, CertifiedBillingConfig, IntegrationLog, AuditLog, User } from '../types';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { APP_CONFIG } from '../lib/config';
import {
  Building2,
  ShieldCheck,
  Key,
  Layers,
  Users,
  History,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  HelpCircle,
  Save,
  Lock,
  MapPin,
  Check,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: { id: string; name: string; role: 'admin' | 'operador' };
  onCompanyUpdated?: (company: CompanyInfo) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onCompanyUpdated,
}) => {
  const [activeSection, setActiveSection] = useState<'company' | 'certified' | 'users' | 'logs'>('company');

  // Company state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<string | null>(null);

  // Certified billing state
  const [billingConfig, setBillingConfig] = useState<CertifiedBillingConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [seriesFS, setSeriesFS] = useState('');
  const [seriesFT, setSeriesFT] = useState('');
  const [seriesFR, setSeriesFR] = useState('');
  const [seriesNC, setSeriesNC] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [isActive, setIsActive] = useState(true);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [isTestingBilling, setIsTestingBilling] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Users & Logs
  const [users, setUsers] = useState<User[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comp, bConfig, uList, intLogs, audLogs] = await Promise.all([
        api.getCompany(),
        api.getCertifiedBilling(),
        api.getUsers(),
        api.getIntegrationLogs(),
        api.getAuditLogs(),
      ]);

      setCompany(comp);
      setBillingConfig(bConfig);
      setApiKeyInput(bConfig.apiKey || '');
      setRegisterId(bConfig.registerId);
      setSeriesFS(bConfig.seriesFS);
      setSeriesFT(bConfig.seriesFT);
      setSeriesFR(bConfig.seriesFR);
      setSeriesNC(bConfig.seriesNC);
      setEnvironment(bConfig.environment);
      setIsActive(bConfig.isActive);

      setUsers(uList);
      setIntegrationLogs(intLogs);
      setAuditLogs(audLogs);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setIsSavingCompany(true);
    setCompanyMsg(null);
    try {
      const res = await api.updateCompany({ ...company, operatorName: currentUser.name });
      if (res.success) {
        setCompanyMsg('Dados da empresa atualizados com sucesso.');
        if (onCompanyUpdated) onCompanyUpdated(res.company);
      }
    } catch (err: any) {
      setCompanyMsg(`Erro: ${err.message}`);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBilling(true);
    setTestResult(null);
    try {
      await api.updateCertifiedBilling({
        apiKey: apiKeyInput,
        registerId,
        seriesFS,
        seriesFT,
        seriesFR,
        seriesNC,
        environment,
        isActive,
        operatorName: currentUser.name,
      });
      setTestResult({
        success: true,
        message: 'Configurações de emissão salvas no servidor com sucesso.',
      });
      loadData();
    } catch (err: any) {
      setTestResult({ success: false, message: `Erro: ${err.message}` });
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleTestBilling = async () => {
    setIsTestingBilling(true);
    setTestResult(null);
    try {
      const res = await api.testCertifiedBilling(currentUser.name);
      setTestResult(res);
      loadData();
    } catch (err: any) {
      setTestResult({ success: false, message: `Erro ao testar: ${err.message}` });
    } finally {
      setIsTestingBilling(false);
    }
  };

  if (loading && !company) {
    return (
      <div className="p-12 text-center text-stone-500 text-sm">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
        <span>Carregando configurações da empresa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subnavegação de Configurações */}
      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-2 shadow-xs gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveSection('company')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'company'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresa &amp; Dados Cadastrais</span>
        </button>

        <button
          onClick={() => setActiveSection('certified')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'certified'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Módulo Fiscal &amp; Integração</span>
        </button>

        <button
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'users'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários &amp; Permissões</span>
        </button>

        <button
          onClick={() => setActiveSection('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'logs'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Auditoria &amp; Logs da API</span>
        </button>
      </div>

      {/* SECÇÃO 1: DADOS DA EMPRESA */}
      {activeSection === 'company' && company && (
        <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-5 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Identificação Comercial &amp; Fiscal - {APP_CONFIG.appName}
              </h3>
              <p className="text-stone-500 mt-0.5">
                Estes dados são impressos nos cupons e transmitidos para validação fiscal.
              </p>
            </div>
            {companyMsg && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                {companyMsg}
              </span>
            )}
          </div>

          {/* Aviso de Endereço Fictício */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Endereço de Demonstração em São Paulo:</strong> {APP_CONFIG.demoAddress.formatted}
              <p className="text-[11px] text-amber-800 mt-0.5">* {APP_CONFIG.demoAddress.notice}</p>
            </div>
          </div>

          {/* Opções de Logotipo para Aprovação */}
          <div className="p-4 sm:p-5 bg-stone-900 rounded-2xl border border-stone-800 text-stone-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Identidade Visual &amp; Logotipo - AX Tech PDV</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Logotipo oficial ativo na barra de navegação, cabeçalhos fiscais e relatórios.
                </p>
              </div>
              {company.logoUrl && company.logoUrl !== '/assets/logos/official_logo.png' && (
                <button
                  type="button"
                  onClick={() => setCompany({ ...company, logoUrl: '/assets/logos/official_logo.png' })}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  Restaurar Logo Oficial
                </button>
              )}
            </div>

            {/* CARD DESTACADO: LOGOTIPO OFICIAL ATIVO */}
            <div
              onClick={() => setCompany({ ...company, logoUrl: '/assets/logos/official_logo.png' })}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-4 ${
                company.logoUrl === '/assets/logos/official_logo.png'
                  ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-stone-800/80 border-stone-700 hover:border-amber-500/60'
              }`}
            >
              <div className="w-full sm:w-60 h-24 sm:h-20 rounded-xl bg-black/60 border border-stone-700/80 p-2 flex items-center justify-center shrink-0">
                <img
                  src="/assets/logos/official_logo.png"
                  alt="Logotipo Oficial AX Tech PDV"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                    Logotipo Oficial
                  </span>
                  {company.logoUrl === '/assets/logos/official_logo.png' && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ativo no Sistema</span>
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-white mt-1">AX Tech PDV - Mais Agilidade, Mais Vendas</h4>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  Identidade visual oficial com emblema 3D em ouro metálico, seta de crescimento ascendente e tipografia prateada de alta fidelidade.
                </p>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <span
                  className={`w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                    company.logoUrl === '/assets/logos/official_logo.png'
                      ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                      : 'bg-stone-700 text-stone-200 hover:bg-stone-600'
                  }`}
                >
                  {company.logoUrl === '/assets/logos/official_logo.png' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Logotipo Ativo</span>
                    </>
                  ) : (
                    <span>Selecionar Oficial</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                Outras Opções de Design
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Opção 1 */}
              <div
                onClick={() => setCompany({ ...company, logoUrl: '/assets/logos/logo_option_1.jpg' })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  company.logoUrl === '/assets/logos/logo_option_1.jpg'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-stone-800/80 border-stone-700 hover:border-stone-500'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-stone-700/60 flex items-center justify-center">
                    <img
                      src="/assets/logos/logo_option_1.jpg"
                      alt="Opção 1: Monograma Tech AX"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 block">Opção 1</span>
                    <h4 className="text-xs font-bold text-white">Monograma Tech AX</h4>
                    <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                      Geométrico moderno com as letras A e X integradas em seta de transação e gradiente dourado âmbar.
                    </p>
                  </div>
                </div>
                <div className="pt-3">
                  <span
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      company.logoUrl === '/assets/logos/logo_option_1.jpg'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-700 text-stone-300'
                    }`}
                  >
                    {company.logoUrl === '/assets/logos/logo_option_1.jpg' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovado &amp; Ativo</span>
                      </>
                    ) : (
                      <span>Selecionar Opção 1</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Opção 2 */}
              <div
                onClick={() => setCompany({ ...company, logoUrl: '/assets/logos/logo_option_2.jpg' })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  company.logoUrl === '/assets/logos/logo_option_2.jpg'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-stone-800/80 border-stone-700 hover:border-stone-500'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-stone-700/60 flex items-center justify-center">
                    <img
                      src="/assets/logos/logo_option_2.jpg"
                      alt="Opção 2: Terminal PDV & Onda"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 block">Opção 2</span>
                    <h4 className="text-xs font-bold text-white">Terminal PDV &amp; Onda</h4>
                    <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                      Silhueta estilizada de caixa registradora e onda de frequência de pagamento com checkmark de aprovação.
                    </p>
                  </div>
                </div>
                <div className="pt-3">
                  <span
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      company.logoUrl === '/assets/logos/logo_option_2.jpg'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-700 text-stone-300'
                    }`}
                  >
                    {company.logoUrl === '/assets/logos/logo_option_2.jpg' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovado &amp; Ativo</span>
                      </>
                    ) : (
                      <span>Selecionar Opção 2</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Opção 3 */}
              <div
                onClick={() => setCompany({ ...company, logoUrl: '/assets/logos/logo_option_3.jpg' })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  company.logoUrl === '/assets/logos/logo_option_3.jpg'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-stone-800/80 border-stone-700 hover:border-stone-500'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-stone-700/60 flex items-center justify-center">
                    <img
                      src="/assets/logos/logo_option_3.jpg"
                      alt="Opção 3: Escudo Tech Hexagonal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 block">Opção 3</span>
                    <h4 className="text-xs font-bold text-white">Escudo Tech Hexagonal</h4>
                    <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                      Emblema futurista em formato de escudo com nós interconectados e letra A luminescente, simbolizando segurança fiscal.
                    </p>
                  </div>
                </div>
                <div className="pt-3">
                  <span
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      company.logoUrl === '/assets/logos/logo_option_3.jpg'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-700 text-stone-300'
                    }`}
                  >
                    {company.logoUrl === '/assets/logos/logo_option_3.jpg' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovado &amp; Ativo</span>
                      </>
                    ) : (
                      <span>Selecionar Opção 3</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Nome Comercial / Fantasia:</label>
              <input
                type="text"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Razão Social:</label>
              <input
                type="text"
                value={company.legalName}
                onChange={(e) => setCompany({ ...company, legalName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">CNPJ / CPF:</label>
              <input
                type="text"
                value={company.nif}
                onChange={(e) => setCompany({ ...company, nif: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">CNAE Principal:</label>
              <input
                type="text"
                value={company.cae}
                onChange={(e) => setCompany({ ...company, cae: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Capital Social:</label>
              <input
                type="text"
                value={company.shareCapital}
                onChange={(e) => setCompany({ ...company, shareCapital: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Endereço do Estabelecimento:</label>
              <input
                type="text"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">CEP &amp; Cidade/UF:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={company.postalCode}
                  onChange={(e) => setCompany({ ...company, postalCode: e.target.value })}
                  className="w-28 p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className="flex-1 p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Telefone Comercial / Celular:</label>
              <input
                type="text"
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">E-mail Comercial:</label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Inscrição Estadual / Registro:</label>
              <input
                type="text"
                value={company.commercialRegistry}
                onChange={(e) => setCompany({ ...company, commercialRegistry: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-200">
            <button
              type="submit"
              disabled={isSavingCompany}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECÇÃO 2: FATURAÇÃO CERTIFICADA */}
      {activeSection === 'certified' && (
        <div className="space-y-6">
          <div className="bg-stone-900 text-white p-6 rounded-2xl border border-stone-800 shadow-md">
            <div className="flex items-center gap-2.5 mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h3 className="text-base font-extrabold">
                Configurações de Emissão Fiscal &amp; Ponto de Venda ({APP_CONFIG.appName})
              </h3>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed max-w-3xl mb-4">
              O sistema gerencia emissão de cupons e documentos fiscais com numeração sequencial, QR Code de consulta, assinatura digital e proteção contra duplicidade.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/80">
                <span className="text-emerald-400 font-bold block mb-1">1. Chave de API</span>
                <span className="text-[11px] text-stone-400">
                  Armazenada no servidor com criptografia. Nunca exposta ao cliente web.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/80">
                <span className="text-emerald-400 font-bold block mb-1">2. Ponto de Venda (PDV)</span>
                <span className="text-[11px] text-stone-400">
                  Identificador de terminal associado ao balcão e conferência de caixa.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/80">
                <span className="text-emerald-400 font-bold block mb-1">3. Séries Fiscais</span>
                <span className="text-[11px] text-stone-400">
                  Controle sequencial com código único de validação.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/80">
                <span className="text-emerald-400 font-bold block mb-1">4. Proteção de Idempotência</span>
                <span className="text-[11px] text-stone-400">
                  Em caso de falha de conexão, a venda é retida como Pendente para retransmissão segura.
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBilling} className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900">
                  Parâmetros do Módulo Fiscal
                </h4>
                <p className="text-stone-500 text-[11px]">
                  Configurações do conector e ambiente de processamento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Ativar Emissão Fiscal</span>
                </label>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Chave / Token de Acesso da API:
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Informe o token da API de emissão..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Protegida no servidor. Em modo sandbox, opera com o simulador oficial.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Identificador do Ponto de Venda (PDV Register):
                </label>
                <input
                  type="text"
                  value={registerId}
                  onChange={(e) => setRegisterId(e.target.value)}
                  placeholder="Ex: PDV-SP-01"
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Série Cupom Fiscal (FS):</label>
                <input
                  type="text"
                  value={seriesFS}
                  onChange={(e) => setSeriesFS(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Série Nota Fiscal (FT):</label>
                <input
                  type="text"
                  value={seriesFT}
                  onChange={(e) => setSeriesFT(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Série Fatura/Recibo (FR):</label>
                <input
                  type="text"
                  value={seriesFR}
                  onChange={(e) => setSeriesFR(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Série Estorno / NC:</label>
                <input
                  type="text"
                  value={seriesNC}
                  onChange={(e) => setSeriesNC(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <label className="block font-bold text-stone-800 mb-1.5">
                Ambiente de Execução:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="env"
                    value="sandbox"
                    checked={environment === 'sandbox'}
                    onChange={() => setEnvironment('sandbox')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    <strong>Ambiente de Homologação / Testes</strong> (Sandbox)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="env"
                    value="production"
                    checked={environment === 'production'}
                    onChange={() => setEnvironment('production')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    <strong>Ambiente de Produção Oficial</strong>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={handleTestBilling}
                disabled={isTestingBilling}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingBilling ? 'animate-spin' : ''}`} />
                <span>{isTestingBilling ? 'Testando conexão...' : 'Testar Conexão com o Módulo Fiscal'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingBilling}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingBilling ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECÇÃO 3: USUÁRIOS */}
      {activeSection === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Usuários &amp; Níveis de Acesso - {APP_CONFIG.appName}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Controle de equipe: Administradores gerenciam configurações e produtos; Operadores registram vendas e caixas.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-sm">{u.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : 'Operador de Caixa'}
                    </span>
                  </div>
                  <span className="text-stone-500 text-[11px]">{u.email}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ativo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECÇÃO 4: AUDITORIA & LOGS */}
      {activeSection === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logs de Integração */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Histórico de Tentativas de Emissão Fiscal
            </h4>
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto text-xs">
              {integrationLogs.length === 0 ? (
                <p className="text-stone-400 py-6 text-center">Sem registros de integração.</p>
              ) : (
                integrationLogs.map((log) => (
                  <div key={log.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.action} - {log.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-stone-800 font-semibold">{log.requestSummary}</p>
                    <p className="text-stone-600 text-[11px] font-mono bg-stone-50 p-1 rounded">
                      {log.responseSummary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Histórico Geral de Auditoria */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Registro de Auditoria de Operações
            </h4>
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-stone-400 py-6 text-center">Sem registros de auditoria.</p>
              ) : (
                auditLogs.map((aud) => (
                  <div key={aud.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{aud.action}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {formatDateTime(aud.timestamp)}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5">{aud.details}</p>
                    <span className="text-[10px] text-stone-400">Por: {aud.userName}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
