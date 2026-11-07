import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, PriceHistoryItem } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import {
  Utensils,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  History,
  Star,
  Search,
  Filter,
  X,
  ShieldCheck,
  Tag,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Camera,
  Link as LinkIcon,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';

interface ProductsViewProps {
  currentUser: { id: string; name: string; role: 'admin' | 'operador' };
}

export const ProductsView: React.FC<ProductsViewProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros & Modo de Visualização (Cards vs Tabela)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formIvaRate, setFormIvaRate] = useState<number>(13);
  const [formAccountantValidated, setFormAccountantValidated] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formPriceReason, setFormPriceReason] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Histórico de Preços
  const [historyTargetProduct, setHistoryTargetProduct] = useState<Product | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormCategoryId(categories[0]?.id || 'cat-1');
    setFormPrice('');
    setFormIvaRate(13); // Restauração Intermédia padrão
    setFormAccountantValidated(false);
    setFormCode('');
    setFormIsFavorite(false);
    setFormPriceReason('');
    setFormImageUrl('');
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormCategoryId(p.categoryId);
    setFormPrice(p.price.toFixed(2));
    setFormIvaRate(p.ivaRate);
    setFormAccountantValidated(p.isAccountantValidated);
    setFormCode(p.internalCode || '');
    setFormIsFavorite(p.isFavorite);
    setFormPriceReason('');
    setFormImageUrl(p.imageUrl || '');
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  // Processamento e compressão da imagem selecionada
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/jpeg', 0.85);
          setFormImageUrl(optimized);
        } else {
          setFormImageUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setFormImageUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(formPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Introduza um preço válido.');
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formName,
          description: formDesc,
          categoryId: formCategoryId,
          price: priceNum,
          ivaRate: formIvaRate,
          isAccountantValidated: formAccountantValidated,
          internalCode: formCode,
          imageUrl: formImageUrl,
          isFavorite: formIsFavorite,
          operatorName: currentUser.name,
          priceChangeReason: formPriceReason || undefined,
        });
      } else {
        await api.createProduct({
          name: formName,
          description: formDesc,
          categoryId: formCategoryId,
          price: priceNum,
          ivaRate: formIvaRate,
          isAccountantValidated: formAccountantValidated,
          internalCode: formCode,
          imageUrl: formImageUrl,
          isFavorite: formIsFavorite,
          operatorName: currentUser.name,
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Erro ao guardar produto: ${err.message || 'Falha no servidor'}`);
    }
  };

  const handleValidateAccountant = async (productId: string) => {
    try {
      await api.validateAccountant(productId, currentUser.name);
      loadData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.internalCode?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Catálogo &amp; Ementa
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gestão de pratos, fotos, categorias, taxas de tributação e histórico de preços.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Alternador de Visualização Cards / Tabela */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white shadow-xs text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {currentUser.role === 'admin' && (
            <button
              onClick={openNewProductModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              Todas as Categorias
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL: CARDS RESPONSIVOS OU TABELA */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 text-sm bg-white rounded-2xl border border-stone-200">
          A carregar catálogo...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-stone-500 text-sm bg-white rounded-2xl border border-stone-200">
          Nenhum produto encontrado.
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUALIZAÇÃO EM GRADE DE CARDS (RESPONSIVA DESKTOP E MOBILE) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return (
              <div
                key={p.id}
                className="group flex flex-col bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all overflow-hidden"
              >
                {/* Imagem do Produto */}
                <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden border-b border-stone-100">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-50">
                      <Utensils className="w-10 h-10 mb-1 opacity-40" />
                      <span className="text-[10px] font-medium text-stone-400">Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Badges superiores na imagem */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-900/80 text-white backdrop-blur-xs">
                      {cat?.name || 'Geral'}
                    </span>
                    {p.internalCode && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/90 text-stone-800 shadow-xs backdrop-blur-xs">
                        #{p.internalCode}
                      </span>
                    )}
                  </div>

                  {p.isFavorite && (
                    <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-amber-500 text-stone-950 shadow-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}

                  {/* Indicador de Disponibilidade */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-900/70 text-white text-[10px] font-medium backdrop-blur-xs">
                    <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span>{p.available ? 'Disponível' : 'Indisponível'}</span>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed min-h-[2rem]">
                      {p.description || 'Sem descrição cadastrada para este item.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base sm:text-lg font-black text-stone-950 font-mono">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                        {p.ivaRate}% ({p.ivaCode})
                      </span>
                    </div>

                    {/* Validação Contabilística */}
                    <div className="flex items-center justify-between text-[11px]">
                      {p.isAccountantValidated ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Validado</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleValidateAccountant(p.id)}
                          className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                          title="Clique para validar tributação"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pendente Validação</span>
                        </button>
                      )}

                      {/* Botões de Ação do Card */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistoryTargetProduct(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Ver Histórico de Preços"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Editar Produto e Foto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Item &amp; Foto</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Preço</th>
                  <th className="py-3 px-4 text-center">Taxa</th>
                  <th className="py-3 px-4 text-center">Validação</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Utensils className="w-4 h-4 text-stone-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {p.isFavorite && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />}
                              <span>{p.name}</span>
                            </div>
                            {p.description && (
                              <span className="block text-[11px] font-normal text-stone-500 truncate max-w-xs">
                                {p.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {p.internalCode || '-'}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {cat?.name || 'Geral'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-stone-950 font-mono text-sm">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                          {p.ivaRate}% ({p.ivaCode})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.isAccountantValidated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Validada</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleValidateAccountant(p.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Pendente</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${p.available ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setHistoryTargetProduct(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Histórico de Preços"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Editar Produto e Foto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO - AJUSTADO E TOTALMENTE RESPONSIVO DESKTOP E MOBILE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl max-h-[94vh] sm:max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-stone-900">
            {/* Header Fixo */}
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  {editingProduct ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto para a Ementa'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {editingProduct
                      ? `Atualize os dados, foto e preço de ${editingProduct.name}`
                      : 'Cadastre um novo item no catálogo com foto e tributação'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com rolagem interna suave e campos responsivos */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              
              {/* UPLOAD DA IMAGEM DO PRODUTO */}
              <div className="space-y-1.5">
                <label className="block font-bold text-stone-800">
                  Foto / Imagem do Produto:
                </label>
                
                {formImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group shadow-xs">
                    <div className="h-44 sm:h-52 w-full flex items-center justify-center bg-stone-900/10">
                      <img
                        src={formImageUrl}
                        alt="Pré-visualização do produto"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Controles de Foto */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-stone-900 font-bold text-xs flex items-center gap-1.5 hover:bg-stone-100 shadow-md cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Trocar Imagem</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-rose-500 shadow-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                    {/* Badge indicando imagem ativa */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-900/80 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>Imagem Ativa</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-stone-300 hover:border-amber-500 bg-stone-50/80 hover:bg-amber-50/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-stone-800">
                        Clique para enviar ou arraste a imagem do produto
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        PNG, JPG ou WEBP (câmera do celular ou arquivo local)
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-200/80 text-stone-700 text-[11px] font-semibold mt-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Escolher Imagem</span>
                    </span>
                  </div>
                )}

                {/* Input de Arquivo Oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                {/* Opção para Colar Link de Imagem */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>A imagem será exibida nos cards, no balcão e no PDV.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-amber-700 hover:text-amber-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{showUrlInput ? 'Ocultar Link' : 'Colar Link URL'}</span>
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-2 pt-1 animate-in fade-in duration-100">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto-produto.jpg"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="flex-1 p-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="px-3 py-1 rounded-xl bg-stone-800 text-white font-bold text-xs cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}
              </div>

              {/* Nome do Item */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">Nome do Prato / Item:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Bacalhau à Lagareiro"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">Descrição / Ingredientes:</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ex: Lombo de bacalhau assado no forno com batatas a murro e azeite..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Categoria & Código Interno - Responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Categoria:</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Código Interno (opcional):</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Ex: PRAT-004"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Preço de Venda & Alíquota - Responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Preço de Venda (R$):</label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: 45.00"
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Tributação / Alíquota:</label>
                  <select
                    value={formIvaRate}
                    onChange={(e) => setFormIvaRate(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value={13}>13% - Alíquota Padrão / Alimentação &amp; Serviços</option>
                    <option value={18}>18% - ICMS Geral</option>
                    <option value={7}>7% - Produtos com Alíquota Diferenciada</option>
                    <option value={0}>0% - Isento / Não Tributado</option>
                  </select>
                </div>
              </div>

              {/* Motivo de Alteração se editando */}
              {editingProduct && (
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Motivo da Alteração de Preço (Histórico):</label>
                  <input
                    type="text"
                    value={formPriceReason}
                    onChange={(e) => setFormPriceReason(e.target.value)}
                    placeholder="Ex: Atualização anual da carta / aumento de custo..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              )}

              {/* Checkboxes de Validação Contabilística & Favorito */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAccountantValidated}
                    onChange={(e) => setFormAccountantValidated(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 shrink-0"
                  />
                  <span className="font-semibold text-stone-800 leading-tight">
                    Taxa de IVA validada previamente pelo contabilista certificado
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFavorite}
                    onChange={(e) => setFormIsFavorite(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 shrink-0"
                  />
                  <span className="font-semibold text-stone-800 leading-tight">
                    Adicionar aos favoritos (acesso rápido no balcão POS)
                  </span>
                </label>
              </div>

              {/* Botões do Rodapé Fixo */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Guardar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE PREÇOS */}
      {historyTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Histórico de Alterações de Preço</h4>
                <p className="text-xs text-stone-400">{historyTargetProduct.name}</p>
              </div>
              <button onClick={() => setHistoryTargetProduct(null)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-72 overflow-y-auto text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-stone-100 font-bold">
                <span>Preço Atual:</span>
                <span className="font-mono text-sm text-stone-950">{formatCurrency(historyTargetProduct.price)}</span>
              </div>

              {historyTargetProduct.priceHistory.length === 0 ? (
                <p className="text-center text-stone-500 py-6">
                  Nenhuma alteração de preço registada após a criação.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {historyTargetProduct.priceHistory.map((item) => (
                    <div key={item.id} className="p-2.5 space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-stone-500 line-through">{formatCurrency(item.oldPrice)}</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(item.newPrice)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>{formatDateTime(item.changedAt)}</span>
                        <span>{item.changedBy}</span>
                      </div>
                      {item.reason && (
                        <p className="text-[11px] text-stone-700 italic">
                          Motivo: {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setHistoryTargetProduct(null)}
                className="px-4 py-1.5 rounded-lg bg-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
