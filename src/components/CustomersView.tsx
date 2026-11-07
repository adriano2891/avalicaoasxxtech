import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import { validatePortugueseNif } from '../lib/nifValidator';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Phone,
  Mail,
  MapPin,
  X,
  CheckCircle,
  AlertTriangle,
  History,
  Trash2,
} from 'lucide-react';

interface CustomersViewProps {
  currentUser: { id: string; name: string; role: 'admin' | 'operador' };
}

export const CustomersView: React.FC<CustomersViewProps> = ({ currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [rgpdConsent, setRgpdConsent] = useState(true);

  // Validação de NIF em tempo real
  const [nifValidation, setNifValidation] = useState<{ isValid: boolean; message?: string } | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const list = await api.getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleNifChange = (val: string) => {
    setNif(val);
    if (val.trim().length >= 8) {
      setNifValidation(validatePortugueseNif(val));
    } else {
      setNifValidation(null);
    }
  };

  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setName('');
    setNif('');
    setEmail('');
    setPhone('');
    setAddress('');
    setPostalCode('');
    setCity('');
    setRgpdConsent(true);
    setNifValidation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setNif(c.nif);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setPostalCode(c.postalCode || '');
    setCity(c.city || '');
    setRgpdConsent(c.rgpdConsent);
    setNifValidation(validatePortugueseNif(c.nif));
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePortugueseNif(nif);
    if (!validation.isValid && nif !== '999999990') {
      alert(`NIF inválido: ${validation.message}`);
      return;
    }

    try {
      await api.saveCustomer({
        id: editingCustomer?.id,
        name,
        nif,
        email,
        phone,
        address,
        postalCode,
        city,
        rgpdConsent,
        operatorName: currentUser.name,
      });

      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(`Erro ao guardar cliente: ${err.message || 'Falha no servidor'}`);
    }
  };

  const handleAnonymize = async (id: string, custName: string) => {
    if (!confirm(`Você tem certeza que deseja anonimizar os dados de "${custName}" nos termos da LGPD / Proteção de Dados? O histórico fiscal continuará nos documentos emitidos, mas os dados de contato serão removidos.`)) {
      return;
    }

    try {
      await api.anonymizeCustomer(id, currentUser.name);
      loadCustomers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.nif.includes(q) || c.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Cadastro de Clientes &amp; Privacidade
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Registro de clientes, validação cadastral e conformidade com privacidade de dados.
          </p>
        </div>

        <button
          onClick={openNewCustomerModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Pesquisa */}
      <div className="p-4 rounded-xl bg-white border border-stone-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, CPF/CNPJ ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Carregando clientes...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Nome / Razão Social</th>
                  <th className="py-3 px-4">CPF / CNPJ</th>
                  <th className="py-3 px-4">Contatos</th>
                  <th className="py-3 px-4">Endereço</th>
                  <th className="py-3 px-4 text-center">Compras</th>
                  <th className="py-3 px-4 text-right">Total Faturado</th>
                  <th className="py-3 px-4 text-center">Privacidade</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {cust.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {cust.nif}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {cust.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /><span>{cust.phone}</span></div>}
                      {cust.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /><span>{cust.email}</span></div>}
                      {!cust.phone && !cust.email && <span>-</span>}
                    </td>
                    <td className="py-3 px-4 text-stone-600 max-w-xs truncate">
                      {cust.address ? `${cust.address}, ${cust.city || ''}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-stone-800">
                      {cust.ordersCount}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-stone-950 font-mono">
                      {formatCurrency(cust.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cust.rgpdConsent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Consentido
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                          Anonimizado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {cust.nif !== '999999990' && (
                        <>
                          <button
                            onClick={() => openEditModal(cust)}
                            className="px-2 py-1 text-xs rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold"
                          >
                            Editar
                          </button>
                          {currentUser.role === 'admin' && cust.rgpdConsent && (
                            <button
                              onClick={() => handleAnonymize(cust.id, cust.name)}
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title="Direito ao Esquecimento (RGPD) - Anonimizar Dados"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm sm:text-base">
                {editingCustomer ? 'Editar Ficha de Cliente' : 'Registar Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nome Completo ou Razão Social:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Fernandes ou Restaurante Lda"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">NIF (Número de Identificação Fiscal):</label>
                <input
                  type="text"
                  required
                  value={nif}
                  onChange={(e) => handleNifChange(e.target.value)}
                  placeholder="Ex: 514892310"
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                {nifValidation && (
                  <p className={`mt-1 text-[11px] font-semibold flex items-center gap-1 ${
                    nifValidation.isValid ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {nifValidation.isValid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{nifValidation.message}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">E-mail para Notas:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@exemplo.com.br"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Telefone / Celular:</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 (11) 9XXXX-XXXX"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Endereço:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">CEP:</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="00000-000"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cidade / UF:</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo - SP"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rgpdConsent}
                    onChange={(e) => setRgpdConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-stone-800">
                    Consentimento de privacidade para emissão e envio digital de comprovantes
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
