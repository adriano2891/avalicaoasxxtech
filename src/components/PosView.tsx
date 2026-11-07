import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  Category,
  Customer,
  SaleItem,
  DocumentType,
  PaymentMethodType,
  PaymentEntry,
  CompanyInfo,
  FiscalDocument,
  SaleType,
} from '../types';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import {
  Search,
  Star,
  Plus,
  Minus,
  Trash2,
  Utensils,
  ShoppingBag,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Printer,
  X,
  Tag,
  ShieldCheck,
  User,
  Phone,
  Percent,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  ShoppingCart,
  DollarSign,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { InvoiceTicketModal } from './InvoiceTicketModal';

export interface CartItem extends SaleItem {
  internalCode?: string;
  imageUrl?: string;
}

interface PosViewProps {
  company: CompanyInfo;
  currentUser: { id: string; name: string; role: 'admin' | 'operador' };
  onSaleCompleted?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  company,
  currentUser,
  onSaleCompleted,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de produtos (Área Esquerda Intocada)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Estado do Pedido Atual
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<SaleType>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Financeiro do Caixa
  const [discountMode, setDiscountMode] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Cliente Associado
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id?: string;
    name: string;
    nif: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({
    name: 'Consumidor Final',
    nif: '999999990',
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    nif: '',
    phone: '',
    email: '',
  });

  // Modais de Ação Rápida
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isOrderNotesModalOpen, setIsOrderNotesModalOpen] = useState(false);
  const [itemNotesModalState, setItemNotesModalState] = useState<{ index: number; name: string; notes: string } | null>(null);
  const [isPreBillModalOpen, setIsPreBillModalOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [isCancelSaleConfirmOpen, setIsCancelSaleConfirmOpen] = useState(false);

  // Modal de Pagamento & Emissão
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('FS');
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethodType | 'debito' | 'credito' | 'split'>('dinheiro');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [mbwayPhone, setMbwayPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [splitPayment1, setSplitPayment1] = useState<{ method: PaymentMethodType; amount: string }>({ method: 'dinheiro', amount: '' });
  const [splitPayment2, setSplitPayment2] = useState<{ method: PaymentMethodType; amount: string }>({ method: 'cartao', amount: '' });
  const [pixCopied, setPixCopied] = useState(false);

  // Resultado da Emissão
  const [completedFiscalDoc, setCompletedFiscalDoc] = useState<FiscalDocument | null>(null);
  const [completedPendingSaleNotice, setCompletedPendingSaleNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, custs] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCustomers(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setCustomers(custs);
    } catch (err) {
      console.error('Erro ao carregar dados do POS:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem de produtos (Área esquerda estritamente preservada)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      if (onlyFavorites && !p.isFavorite) return false;
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCode = p.internalCode?.toLowerCase().includes(query);
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, onlyFavorites]);

  // Cálculos financeiros do carrinho em tempo real
  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let tax = 0;

    cartItems.forEach((it) => {
      const base = it.total / (1 + it.ivaRate / 100);
      gross += it.unitPrice * it.quantity;
      net += base;
      tax += it.total - base;
    });

    let discountTotal = 0;
    if (discountMode === 'percent') {
      discountTotal = (gross * discountValue) / 100;
    } else {
      discountTotal = Math.min(gross, discountValue);
    }

    const currentDeliveryFee = saleType === 'delivery' ? (deliveryFee || 5.0) : 0;
    const finalAmount = Math.max(0, gross - discountTotal + additionalFee + currentDeliveryFee);

    return {
      gross: Number(gross.toFixed(2)),
      discount: Number(discountTotal.toFixed(2)),
      additional: Number(additionalFee.toFixed(2)),
      delivery: Number(currentDeliveryFee.toFixed(2)),
      net: Number(net.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      final: Number(finalAmount.toFixed(2)),
    };
  }, [cartItems, discountMode, discountValue, additionalFee, deliveryFee, saleType]);

  // Imagem correspondente por produto ou categoria
  const getProductImage = (prod: { name?: string; productName?: string; imageUrl?: string }): string => {
    if (prod.imageUrl && prod.imageUrl.trim()) return prod.imageUrl;
    const name = (prod.name || prod.productName || '').toLowerCase();
    if (name.includes('burguer') || name.includes('hamb') || name.includes('lanche')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('fritas') || name.includes('batata')) {
      return 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('coca')) {
      return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('sprite')) {
      return 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('fanta')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('água') || name.includes('mineral')) {
      return 'https://images.unsplash.com/photo-1559839914-1b396ec67e23?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('heineken') || name.includes('cerveja')) {
      return 'https://images.unsplash.com/photo-1608270199049-74d712f5a639?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('nugget')) {
      return 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('calabresa')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('coxinha')) {
      return 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('pastel') && !name.includes('nata')) {
      return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('churros')) {
      return 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('bacalhau')) {
      return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('feijoada')) {
      return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('polvo')) {
      return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('marmita') || name.includes('frango')) {
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('suco')) {
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('vinho')) {
      return 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('café') || name.includes('expresso')) {
      return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80';
    }
    if (name.includes('nata')) {
      return 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
  };

  // Adicionar produto ao carrinho automaticamente ao clicar na esquerda
  const addToCart = (product: Product) => {
    const itemImg = product.imageUrl || getProductImage(product);
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.productId === product.id && !it.notes);
      if (existingIndex > -1) {
        const next = [...prev];
        const item = next[existingIndex];
        const newQty = item.quantity + 1;
        const rawTotal = item.unitPrice * newQty;
        const discountAmt = (rawTotal * item.discountPercentage) / 100;
        const lineTotal = rawTotal - discountAmt;
        const base = lineTotal / (1 + item.ivaRate / 100);

        next[existingIndex] = {
          ...item,
          quantity: newQty,
          discountAmount: discountAmt,
          total: lineTotal,
          taxBase: Number(base.toFixed(2)),
          ivaAmount: Number((lineTotal - base).toFixed(2)),
        };
        return next;
      } else {
        const rawTotal = product.price;
        const base = rawTotal / (1 + product.ivaRate / 100);

        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price,
            discountPercentage: 0,
            discountAmount: 0,
            total: rawTotal,
            ivaRate: product.ivaRate,
            ivaCode: product.ivaCode,
            taxBase: Number(base.toFixed(2)),
            ivaAmount: Number((rawTotal - base).toFixed(2)),
            internalCode: product.internalCode || '1001',
            imageUrl: itemImg,
            notes: '',
          },
        ];
      }
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      const rawTotal = item.unitPrice * newQty;
      const discountAmt = (rawTotal * item.discountPercentage) / 100;
      const lineTotal = rawTotal - discountAmt;
      const base = lineTotal / (1 + item.ivaRate / 100);

      next[index] = {
        ...item,
        quantity: newQty,
        discountAmount: discountAmt,
        total: lineTotal,
        taxBase: Number(base.toFixed(2)),
        ivaAmount: Number((lineTotal - base).toFixed(2)),
      };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
    setTableNumber('');
    setOrderReference('');
    setOrderNotes('');
    setCustomerPhone('');
    setDiscountValue(0);
    setAdditionalFee(0);
    setDeliveryFee(0);
    setSelectedCustomer({ name: 'Consumidor Final', nif: '999999990' });
    setIsClearCartConfirmOpen(false);
  };

  const cancelSale = () => {
    clearCart();
    setIsCancelSaleConfirmOpen(false);
  };

  // Cálculo do troco em dinheiro
  const tenderedNumber = parseFloat(cashTendered.replace(',', '.')) || 0;
  const changeAmount = Math.max(0, tenderedNumber - totals.final);

  // Abertura do modal de pagamento
  const handleOpenPayment = () => {
    if (cartItems.length === 0) return;
    setCashTendered(totals.final.toFixed(2));
    const half = (totals.final / 2).toFixed(2);
    setSplitPayment1({ method: 'dinheiro', amount: half });
    setSplitPayment2({ method: 'cartao', amount: (totals.final - parseFloat(half)).toFixed(2) });
    setIsPaymentModalOpen(true);
  };

  // Submissão da Venda e Emissão Fiscal Certificada
  const handleFinalizeSale = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    if (docType === 'FT' && selectedCustomer.nif === '999999990') {
      alert('Para emissão de Fatura (FT), é obrigatório associar um CPF/CNPJ válido de cliente.');
      return;
    }

    setIsSubmitting(true);

    let paymentEntries: PaymentEntry[] = [];

    if (activePaymentMethod === 'split') {
      const amt1 = parseFloat(splitPayment1.amount.replace(',', '.')) || 0;
      const amt2 = parseFloat(splitPayment2.amount.replace(',', '.')) || 0;
      paymentEntries = [
        { method: splitPayment1.method, amount: amt1 },
        { method: splitPayment2.method, amount: amt2 },
      ];
    } else {
      const methodKey: PaymentMethodType =
        activePaymentMethod === 'debito' || activePaymentMethod === 'credito'
          ? 'cartao'
          : (activePaymentMethod as PaymentMethodType);

      paymentEntries = [
        {
          method: methodKey,
          amount: totals.final,
          reference:
            activePaymentMethod === 'mbway'
              ? (mbwayPhone || 'PIX Instantâneo')
              : activePaymentMethod === 'credito'
              ? `Crédito ${creditInstallments}x`
              : activePaymentMethod === 'debito'
              ? 'Débito'
              : undefined,
          tendered: activePaymentMethod === 'dinheiro' ? tenderedNumber : undefined,
          change: activePaymentMethod === 'dinheiro' ? changeAmount : undefined,
        },
      ];
    }

    const salePayload = {
      items: cartItems,
      payments: paymentEntries,
      saleType,
      tableNumber: saleType === 'dine_in' ? tableNumber : undefined,
      orderReference: orderReference || (customerPhone ? `Tel: ${customerPhone}` : undefined),
      customer: {
        ...selectedCustomer,
        phone: customerPhone || selectedCustomer.phone,
      },
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      notes: orderNotes,
      documentType: docType,
    };

    try {
      const result = await api.createSale(salePayload);

      setIsPaymentModalOpen(false);

      if (result.fiscalStatus === 'emitido' && result.fiscalDocument) {
        setCompletedFiscalDoc(result.fiscalDocument);
        setCompletedPendingSaleNotice(null);
      } else {
        setCompletedFiscalDoc(null);
        setCompletedPendingSaleNotice(
          result.pendingReason ||
            'Venda registrada com sucesso! A integração certificada está pendente/offline, pelo que o comprovante fiscal será transmitido em lote.'
        );
      }

      clearCart();
      if (onSaleCompleted) onSaleCompleted();
    } catch (err: any) {
      alert(`Erro ao processar venda: ${err.message || 'Falha no servidor'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-130px)] min-h-[580px] max-h-[calc(100vh-110px)]">
      {/* COLUNA ESQUERDA: CATÁLOGO DE PRODUTOS & IMAGENS (Cols 1-7) */}
      <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 flex flex-col h-full bg-[#0d1520] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Barra Superior do Catálogo: Filtros e Pesquisa */}
        <div className="p-3 border-b border-slate-800 space-y-2.5 bg-[#0d1520] shrink-0">
          <div className="flex items-center gap-2.5 justify-between">
            {/* Campo de Pesquisa Rápida */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-slate-900/90 text-white placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botão de Filtros */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                onlyFavorites
                  ? 'bg-amber-500 border-amber-500 text-stone-950 shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-stone-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-stone-950 text-stone-950' : 'text-amber-400'}`} />
              <span>Filtros</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>

          {/* Categorias Rápidas em Botões */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#00E676] text-stone-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900/90 border border-slate-800 text-stone-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#00E676] text-stone-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900/90 border border-slate-800 text-stone-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grelha de Produtos com Foto Correspondente */}
        <div className="flex-1 p-3 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm font-semibold text-stone-400">Carregando catálogo...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-2">
              <Utensils className="w-10 h-10 stroke-[1.5]" />
              <p className="text-sm font-semibold">Nenhum produto encontrado nesta categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="flex flex-col items-center justify-between p-2.5 rounded-2xl bg-[#131d2b] border border-slate-800 hover:border-emerald-500/80 hover:bg-[#172335] active:scale-95 transition-all group relative cursor-pointer min-h-[160px] shadow-sm"
                >
                  {prod.isFavorite && (
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 absolute top-2 right-2 z-10" />
                  )}

                  {/* Imagem do Produto Correspondente */}
                  <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-[#0d1520]/80 border border-slate-800/80 flex items-center justify-center relative shrink-0 p-1 group-hover:border-slate-700 transition-colors">
                    <img
                      src={getProductImage(prod)}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-md"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Nome do Produto */}
                  <h4 className="font-bold text-xs sm:text-sm text-white leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors text-center w-full mt-2">
                    {prod.name}
                  </h4>

                  {/* Preço do Produto */}
                  <div className="mt-1 flex items-center justify-center w-full">
                    <span className="text-sm sm:text-base font-black text-white font-mono">
                      {formatCurrency(prod.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: CAIXA PDV PROFISSIONAL ASSX TECH (Ajustado, sem cortes e 100% responsivo) */}
      <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 flex flex-col h-full bg-[#0d1520] rounded-2xl border-2 border-emerald-500 shadow-2xl overflow-hidden text-white">
        {/* 1. CABEÇALHO DA VENDA */}
        <div className="p-2.5 sm:p-3 border-b border-slate-800 bg-[#0d1520] space-y-2 shrink-0">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
            {/* Ícone e Título da Venda */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs shadow-emerald-500/20">
                <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="leading-tight">
                <h3 className="text-base font-black tracking-tight text-white whitespace-nowrap">
                  Nova Venda
                </h3>
                <p className="text-[11px] text-stone-400 font-medium whitespace-nowrap">Monte seu pedido</p>
              </div>
            </div>

            {/* Formas de Atendimento (Pills) */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSaleType('dine_in');
                  setDeliveryFee(0);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  saleType === 'dine_in'
                    ? 'bg-[#22c55e] text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-stone-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Local</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaleType('takeaway');
                  setDeliveryFee(0);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  saleType === 'takeaway'
                    ? 'bg-[#22c55e] text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-stone-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Retirada</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaleType('delivery');
                  if (deliveryFee === 0) setDeliveryFee(5.0);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  saleType === 'delivery'
                    ? 'bg-[#22c55e] text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-stone-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Entrega</span>
              </button>
            </div>
          </div>

          {/* Barra de Identificação do Pedido: Cliente, Telefone e Mesa/Comanda */}
          <div className="grid grid-cols-12 gap-1.5">
            {/* Campo 1: Cliente */}
            <div
              onClick={() => setIsCustomerModalOpen(true)}
              className="col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1.5 flex items-center gap-1.5 cursor-pointer hover:border-slate-700 transition-colors group"
            >
              <User className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-stone-400 leading-none mb-0.5 truncate">
                  Cliente (opcional)
                </span>
                <span className="block text-xs font-semibold text-white truncate">
                  {selectedCustomer.name}
                </span>
              </div>
            </div>

            {/* Campo 2: Telefone */}
            <div className="col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1.5 flex items-center gap-1.5 focus-within:border-emerald-500 transition-colors">
              <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-stone-400 leading-none mb-0.5 truncate">
                  Telefone
                </span>
                <input
                  type="text"
                  placeholder="(99) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder:text-stone-500 focus:outline-hidden font-mono truncate"
                />
              </div>
            </div>

            {/* Campo 3: Mesa/Comanda + Dropdown */}
            <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1.5 flex items-center gap-1 focus-within:border-emerald-500 transition-colors">
              <Utensils className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-stone-400 leading-none mb-0.5 truncate">
                  Mesa/Com.
                </span>
                <input
                  type="text"
                  placeholder="Ex: 12"
                  value={saleType === 'dine_in' ? tableNumber : orderReference}
                  onChange={(e) => {
                    if (saleType === 'dine_in') setTableNumber(e.target.value);
                    else setOrderReference(e.target.value);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-white placeholder:text-stone-500 focus:outline-hidden truncate"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="p-0.5 text-stone-400 hover:text-white shrink-0 cursor-pointer"
                title="Mais Opções"
              >
                {showCustomerDropdown ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Painel Expansível de Detalhes Adicionais */}
          {showCustomerDropdown && (
            <div className="p-2.5 bg-slate-900/95 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-300">CPF/CNPJ na Nota:</span>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={selectedCustomer.nif === '999999990' ? '' : selectedCustomer.nif}
                  onChange={(e) =>
                    setSelectedCustomer((prev) => ({
                      ...prev,
                      nif: e.target.value || '999999990',
                    }))
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs w-36 text-right focus:border-emerald-500"
                />
              </div>
              {saleType === 'delivery' && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-300">Endereço de Entrega:</span>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro..."
                    value={selectedCustomer.address || ''}
                    onChange={(e) =>
                      setSelectedCustomer((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white text-xs w-48 focus:border-emerald-500"
                  />
                </div>
              )}
              {orderNotes && (
                <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700/80 text-stone-300 text-[11px] flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="italic">Obs do Pedido: {orderNotes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. CABEÇALHO DA LISTA DE PRODUTOS */}
        <div className="px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
          <div className="flex-1">Produto</div>
          <div className="w-20 text-center">Qtd.</div>
          <div className="w-16 sm:w-20 text-right">Preço</div>
          <div className="w-16 sm:w-20 text-right">Subtotal</div>
          <div className="w-7 shrink-0"></div>
        </div>

        {/* 3. LISTA DE PRODUTOS ADICIONADOS */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-1.5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-2 py-6">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
                <ShoppingCart className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="text-center px-4">
                <p className="font-bold text-xs sm:text-sm text-stone-300">Nenhum produto adicionado.</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Selecione os itens no catálogo ao lado.
                </p>
              </div>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                {/* Imagem Thumbnail e Detalhes do Produto */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={item.imageUrl || getProductImage(item)}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-white truncate leading-tight">
                      {item.productName}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono text-stone-400">
                        Cód: {item.internalCode || '1001'}
                      </span>
                      {item.notes ? (
                        <button
                          type="button"
                          onClick={() =>
                            setItemNotesModalState({
                              index,
                              name: item.productName,
                              notes: item.notes || '',
                            })
                          }
                          className="px-1 py-0.2 rounded bg-sky-950/80 border border-sky-600/50 text-[9px] font-semibold text-sky-300 hover:bg-sky-900 transition-colors truncate max-w-[100px] cursor-pointer"
                        >
                          Obs: {item.notes}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setItemNotesModalState({
                              index,
                              name: item.productName,
                              notes: '',
                            })
                          }
                          className="text-[9px] text-stone-500 hover:text-sky-400 transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" /> Obs
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controles de Quantidade (- Qtd +) */}
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, -1)}
                    className="w-5 h-5 flex items-center justify-center text-stone-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-black text-xs text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, 1)}
                    className="w-5 h-5 flex items-center justify-center text-stone-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Preço Unitário */}
                <div className="w-16 sm:w-20 text-right font-bold text-xs text-stone-300 shrink-0 font-mono">
                  {formatCurrency(item.unitPrice)}
                </div>

                {/* Subtotal da Linha */}
                <div className="w-16 sm:w-20 text-right font-black text-xs sm:text-sm text-white shrink-0 font-mono">
                  {formatCurrency(item.total)}
                </div>

                {/* Botão Remover Linha (Lixeira Vermelha) */}
                <div className="w-7 shrink-0 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Remover produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. RESUMO FINANCEIRO & BOTÕES DE OPERAÇÃO (100% Ajustado, sem corte) */}
        <div className="border-t-2 border-emerald-500/50 p-2 sm:p-2.5 bg-[#0a0f18] shrink-0 space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
            {/* Bloco Esquerdo: Resumo Financeiro */}
            <div className="flex flex-col justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-stone-300 text-[10px]">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resumo Financeiro</span>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between items-center text-stone-400 text-[11px]">
                <span>Subtotal:</span>
                <span className="font-bold text-white font-mono">
                  {formatCurrency(totals.gross)}
                </span>
              </div>

              {/* Desconto com Alternância % / R$ e Campo Numérico */}
              <div className="flex items-center justify-between text-stone-400 text-[11px] gap-1">
                <span className="shrink-0">Desconto:</span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDiscountMode('percent')}
                      className={`px-1 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                        discountMode === 'percent'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode('fixed')}
                      className={`px-1 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                        discountMode === 'fixed'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue || ''}
                    placeholder="0,00"
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-12 px-1 py-0.2 text-right font-mono text-[11px] rounded bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="font-bold text-white font-mono shrink-0 text-[11px]">
                    {totals.discount > 0 ? `-${formatCurrency(totals.discount)}` : 'R$ 0,00'}
                  </span>
                </div>
              </div>

              {/* Acréscimos */}
              <div className="flex justify-between items-center text-stone-400 text-[11px]">
                <span>Acréscimos:</span>
                <span className="font-bold text-white font-mono">
                  {additionalFee > 0 ? `+${formatCurrency(totals.additional)}` : 'R$ 0,00'}
                </span>
              </div>

              {/* Taxa de Entrega */}
              <div className="flex justify-between items-center text-stone-400 text-[11px]">
                <span>Taxa de Entrega:</span>
                <span className="font-bold text-white font-mono">
                  {formatCurrency(totals.delivery)}
                </span>
              </div>

              {/* Impostos */}
              <div className="flex justify-between items-center text-stone-400 text-[11px]">
                <span>Impostos:</span>
                <span className="font-bold text-white font-mono">
                  {formatCurrency(totals.tax)}
                </span>
              </div>

              {/* Destaque Visual do Total Geral */}
              <div className="mt-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-inner">
                <span className="font-black text-xs sm:text-sm tracking-wide">Total Geral:</span>
                <span className="text-base sm:text-lg font-black font-mono">
                  {formatCurrency(totals.final)}
                </span>
              </div>
            </div>

            {/* Bloco Direito: Grade de 6 Botões de Operação + Botão Finalizar Venda */}
            <div className="flex flex-col justify-between space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 flex-1">
                {/* 1. Aplicar Desconto (Azul) */}
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="p-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Aplicar Desconto
                  </span>
                </button>

                {/* 2. Identificar Cliente (Azul) */}
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="p-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Identificar Cliente
                  </span>
                </button>

                {/* 3. Adicionar Observação (Azul) */}
                <button
                  type="button"
                  onClick={() => setIsOrderNotesModalOpen(true)}
                  className="p-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Adicionar Obs.
                  </span>
                </button>

                {/* 4. Imprimir Pré-Conta (Roxo) */}
                <button
                  type="button"
                  onClick={() => setIsPreBillModalOpen(true)}
                  disabled={cartItems.length === 0}
                  className="p-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Imprimir Pré-Conta
                  </span>
                </button>

                {/* 5. Limpar Pedido (Cinza) */}
                <button
                  type="button"
                  onClick={() => setIsClearCartConfirmOpen(true)}
                  disabled={cartItems.length === 0}
                  className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Limpar Pedido
                  </span>
                </button>

                {/* 6. Cancelar Venda (Vermelho) */}
                <button
                  type="button"
                  onClick={() => setIsCancelSaleConfirmOpen(true)}
                  disabled={cartItems.length === 0}
                  className="p-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm cursor-pointer min-h-[46px]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold leading-tight">
                    Cancelar Venda
                  </span>
                </button>
              </div>

              {/* Botão Principal de Destaque: FINALIZAR VENDA (Verde Vibrante) */}
              <button
                type="button"
                onClick={handleOpenPayment}
                disabled={cartItems.length === 0}
                className="w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm bg-[#00E676] hover:bg-[#00c853] text-stone-950 shadow-md shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>FINALIZAR VENDA</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: PAGAMENTO & EMISSÃO FISCAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 text-white">
            {/* Cabeçalho */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Finalizar Venda &amp; Pagamento
                </h3>
                <p className="text-xs text-stone-400">
                  {selectedCustomer.name} (CPF/CNPJ: {selectedCustomer.nif})
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Total a Pagar em Destaque */}
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-xs font-bold text-emerald-300 uppercase block">
                    Valor Total a Cobrar
                  </span>
                  <span className="text-xs text-stone-400">
                    {cartItems.reduce((acc, it) => acc + it.quantity, 0)} itens no pedido
                  </span>
                </div>
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(totals.final)}
                </span>
              </div>

              {/* Seletor do Tipo de Documento Fiscal */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Tipo de Documento Fiscal (Certificado AT)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocType('FS')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      docType === 'FS'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                        : 'bg-slate-800 text-stone-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Fatura Simplificada
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType('FT')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      docType === 'FT'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                        : 'bg-slate-800 text-stone-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Fatura com CPF/CNPJ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType('FR')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      docType === 'FR'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                        : 'bg-slate-800 text-stone-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Fatura-Recibo
                  </button>
                </div>
              </div>

              {/* Seleção do Meio de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('dinheiro')}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      activePaymentMethod === 'dinheiro'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <span className="text-[11px]">Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('mbway')}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      activePaymentMethod === 'mbway'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-teal-400" />
                    <span className="text-[11px]">PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('debito')}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      activePaymentMethod === 'debito'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    <span className="text-[11px]">Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('credito')}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      activePaymentMethod === 'credito'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    <span className="text-[11px]">Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod('split')}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      activePaymentMethod === 'split'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <span className="text-[11px]">Dividir</span>
                  </button>
                </div>
              </div>

              {/* Detalhes de Pagamento em Dinheiro (Cálculo de Troco) */}
              {activePaymentMethod === 'dinheiro' && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-300">
                      Valor Entregue pelo Cliente (R$):
                    </label>
                    <input
                      type="text"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-32 px-3 py-1.5 text-right font-mono font-bold text-sm rounded-lg border border-slate-600 bg-slate-900 text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  {/* Atalhos Rápidos de Cédulas */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCashTendered(totals.final.toFixed(2))}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-600/50"
                    >
                      Exato
                    </button>
                    {[10, 20, 50, 100, 200].map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setCashTendered(note.toFixed(2))}
                        className="flex-1 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-stone-200 text-xs font-bold hover:bg-slate-600"
                      >
                        R$ {note}
                      </button>
                    ))}
                  </div>

                  {/* Troco */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-xs font-bold text-stone-300">Troco a Devolver:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {formatCurrency(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Detalhes de Pagamento em PIX */}
              {activePaymentMethod === 'mbway' && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 text-center">
                  <div className="inline-block p-3 bg-white rounded-xl shadow-md">
                    {/* QR Code Simulado Visual */}
                    <div className="w-32 h-32 bg-stone-900 flex items-center justify-center p-2 rounded">
                      <QrCode className="w-28 h-28 text-white" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Escaneie para pagar com PIX
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Chave CNPJ: 12.345.678/0001-90 (ASSX Tech PDV)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('00020126580014br.gov.bcb.pix013612345678000190520400005303986540549.005802BR5909ASSX TECH6009SAO PAULO62070503***6304');
                      setPixCopied(true);
                      setTimeout(() => setPixCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white border border-slate-600 transition-colors"
                  >
                    {pixCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Código Pix Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-400" />
                        <span>Copiar Código Pix (Copia e Cola)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Detalhes de Cartão de Crédito (Parcelas) */}
              {activePaymentMethod === 'credito' && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <label className="text-xs font-semibold text-stone-300 block">
                    Parcelamento na Maquininha:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((parc) => (
                      <button
                        key={parc}
                        type="button"
                        onClick={() => setCreditInstallments(parc)}
                        className={`p-2 rounded-lg text-xs font-bold border ${
                          creditInstallments === parc
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-slate-900 border-slate-700 text-stone-300'
                        }`}
                      >
                        {parc}x de {formatCurrency(totals.final / parc)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalhes de Pagamento Dividido */}
              {activePaymentMethod === 'split' && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-stone-300 block">
                    Dividir Valor entre Duas Formas:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 space-y-1.5">
                      <label className="text-[11px] text-stone-400 block font-semibold">1ª Forma:</label>
                      <select
                        value={splitPayment1.method}
                        onChange={(e) =>
                          setSplitPayment1((prev) => ({
                            ...prev,
                            method: e.target.value as PaymentMethodType,
                          }))
                        }
                        className="w-full bg-slate-800 text-white rounded p-1 text-xs border border-slate-700"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao">Cartão</option>
                        <option value="mbway">PIX</option>
                      </select>
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={splitPayment1.amount}
                        onChange={(e) =>
                          setSplitPayment1((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        className="w-full bg-slate-800 text-white rounded p-1 text-xs font-mono border border-slate-700"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 space-y-1.5">
                      <label className="text-[11px] text-stone-400 block font-semibold">2ª Forma:</label>
                      <select
                        value={splitPayment2.method}
                        onChange={(e) =>
                          setSplitPayment2((prev) => ({
                            ...prev,
                            method: e.target.value as PaymentMethodType,
                          }))
                        }
                        className="w-full bg-slate-800 text-white rounded p-1 text-xs border border-slate-700"
                      >
                        <option value="cartao">Cartão</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="mbway">PIX</option>
                      </select>
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={splitPayment2.amount}
                        onChange={(e) =>
                          setSplitPayment2((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        className="w-full bg-slate-800 text-white rounded p-1 text-xs font-mono border border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Informação Legal de Emissão */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-stone-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  O documento fiscal será gerado e assinado via infraestrutura certificada nº 2230/AT.
                </span>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-stone-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isSubmitting}
                className="flex-2 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>A emitir comprovante...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Concluir Venda &amp; Emitir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APLICAR DESCONTO */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-sky-400" />
                <h4 className="font-extrabold text-sm">Aplicar Desconto</h4>
              </div>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 font-semibold mb-1 block">Atalhos de Desconto (%):</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 20, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountMode('percent');
                        setDiscountValue(pct);
                      }}
                      className={`p-2 rounded-lg font-bold border transition-colors ${
                        discountMode === 'percent' && discountValue === pct
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-800 text-stone-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-semibold mb-1 block">Valor Personalizado:</label>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setDiscountMode('percent')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        discountMode === 'percent'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-stone-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode('fixed')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        discountMode === 'fixed'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-stone-400'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-stone-400">Desconto Calculado:</span>
                <span className="font-bold text-sky-400 font-mono text-sm">
                  {formatCurrency(totals.discount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              Confirmar Desconto
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: IDENTIFICAR CLIENTE */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden text-white">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-400" />
                <h4 className="font-extrabold text-sm">Identificar Cliente</h4>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Botão Rápido: Consumidor Final */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer({ name: 'Consumidor Final', nif: '999999990' });
                  setCustomerPhone('');
                  setIsCustomerModalOpen(false);
                }}
                className="w-full p-2.5 rounded-xl text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <div className="font-bold text-xs text-emerald-400">Consumidor Final</div>
                <div className="text-[11px] text-stone-400">Sem identificação de CPF/CNPJ</div>
              </button>

              {/* Barra de Pesquisa */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF/CNPJ ou telefone..."
                  value={customerSearchInput}
                  onChange={(e) => setCustomerSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* Lista de Clientes */}
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl">
                {customers
                  .filter((c) => {
                    const q = customerSearchInput.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      c.nif.includes(q) ||
                      (c.phone && c.phone.includes(q))
                    );
                  })
                  .map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer({
                          id: cust.id,
                          name: cust.name,
                          nif: cust.nif,
                          email: cust.email,
                          phone: cust.phone,
                          address: cust.address,
                        });
                        if (cust.phone) setCustomerPhone(cust.phone);
                        setIsCustomerModalOpen(false);
                      }}
                      className="w-full p-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{cust.name}</div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          CPF/CNPJ: {cust.nif} {cust.phone ? `• Tel: ${cust.phone}` : ''}
                        </div>
                      </div>
                      <span className="text-[11px] text-sky-400 font-bold">Selecionar</span>
                    </button>
                  ))}
              </div>

              {/* Cadastro Rápido de Novo Cliente */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-stone-300 block">
                  Cadastrar Cliente Rapidamente:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={newCustomerForm.name}
                    onChange={(e) =>
                      setNewCustomerForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500"
                  />
                  <input
                    type="text"
                    placeholder="CPF ou CNPJ"
                    value={newCustomerForm.nif}
                    onChange={(e) =>
                      setNewCustomerForm((prev) => ({ ...prev, nif: e.target.value }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Telefone / Celular"
                    value={newCustomerForm.phone}
                    onChange={(e) =>
                      setNewCustomerForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500 font-mono"
                  />
                  <input
                    type="email"
                    placeholder="E-mail (opcional)"
                    value={newCustomerForm.email}
                    onChange={(e) =>
                      setNewCustomerForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCustomerForm.name.trim()) {
                      alert('Informe ao menos o nome do cliente.');
                      return;
                    }
                    try {
                      const res = await api.saveCustomer({
                        name: newCustomerForm.name,
                        nif: newCustomerForm.nif || '999999990',
                        phone: newCustomerForm.phone,
                        email: newCustomerForm.email,
                        operatorName: currentUser.name,
                      });
                      if (res.customer) {
                        setSelectedCustomer({
                          id: res.customer.id,
                          name: res.customer.name,
                          nif: res.customer.nif,
                          phone: res.customer.phone,
                          email: res.customer.email,
                        });
                        if (res.customer.phone) setCustomerPhone(res.customer.phone);
                        setIsCustomerModalOpen(false);
                      }
                    } catch (e) {
                      setSelectedCustomer({
                        name: newCustomerForm.name,
                        nif: newCustomerForm.nif || '999999990',
                        phone: newCustomerForm.phone,
                        email: newCustomerForm.email,
                      });
                      if (newCustomerForm.phone) setCustomerPhone(newCustomerForm.phone);
                      setIsCustomerModalOpen(false);
                    }
                  }}
                  className="w-full py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  Salvar e Associar à Venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADICIONAR OBSERVAÇÃO AO PEDIDO */}
      {isOrderNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h4 className="font-extrabold text-sm">Observações Gerais do Pedido</h4>
              </div>
              <button
                onClick={() => setIsOrderNotesModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Ex: Servir bebidas com gelo e limão, cliente com pressa, embalar para viagem..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500 text-xs focus:outline-hidden focus:border-sky-500"
              />

              {/* Chips Rápidos */}
              <div>
                <span className="text-[11px] font-semibold text-stone-400 block mb-1.5">
                  Atalhos Rápidos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Sem talheres plásticos',
                    'Bebidas primeiro',
                    'Mesa na varanda',
                    'Caprichar no molho',
                    'Separar embalagens',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setOrderNotes((prev) => (prev ? `${prev}, ${chip}` : chip))
                      }
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-stone-300 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOrderNotesModalOpen(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              Salvar Observação
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: OBSERVAÇÃO ESPECÍFICA DO ITEM */}
      {itemNotesModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-sm">Observação do Item</h4>
                <p className="text-xs text-emerald-400 font-bold truncate">
                  {itemNotesModalState.name}
                </p>
              </div>
              <button
                onClick={() => setItemNotesModalState(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ex: Sem cebola, extra crocante, bem passado..."
                value={itemNotesModalState.notes}
                onChange={(e) =>
                  setItemNotesModalState((prev) =>
                    prev ? { ...prev, notes: e.target.value } : null
                  )
                }
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-stone-500 text-xs focus:outline-hidden focus:border-emerald-500"
              />

              {/* Chips Rápidos de Cozinha */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Sem cebola',
                  'Extra crocante',
                  'Mal passado',
                  'Ao ponto',
                  'Bem passado',
                  'Sem molho',
                  'Gelo e limão',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setItemNotesModalState((prev) =>
                        prev
                          ? {
                              ...prev,
                              notes: prev.notes ? `${prev.notes}, ${chip}` : chip,
                            }
                          : null
                      )
                    }
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-stone-300"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (itemNotesModalState) {
                  const idx = itemNotesModalState.index;
                  setCartItems((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], notes: itemNotesModalState.notes.trim() };
                    return next;
                  });
                  setItemNotesModalState(null);
                }
              }}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              Confirmar no Item
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: IMPRIMIR PRÉ-CONTA / CONFERÊNCIA DE MESA */}
      {isPreBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 text-stone-900">
            {/* Cabeçalho do Cupom */}
            <div className="p-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h4 className="font-extrabold text-sm">Conferência de Mesa (Pré-Conta)</h4>
              </div>
              <button
                onClick={() => setIsPreBillModalOpen(false)}
                className="text-purple-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulação do Talão Térmico de Mesa */}
            <div id="printable-prebill" className="p-5 font-mono text-xs space-y-3 bg-stone-50 border-b border-stone-200">
              <div className="text-center space-y-0.5 border-b border-dashed border-stone-300 pb-2">
                <h5 className="font-black text-sm uppercase">{company.name}</h5>
                <p className="text-[10px] text-stone-600">{company.address}</p>
                <p className="text-[10px] text-stone-600">CNPJ: {company.nif}</p>
                <p className="text-[10px] font-bold text-purple-700 uppercase mt-1">
                  *** CONFERÊNCIA DE CONTA - NÃO É DOCUMENTO FISCAL ***
                </p>
              </div>

              <div className="text-[11px] text-stone-700 space-y-0.5 border-b border-dashed border-stone-300 pb-2">
                <div className="flex justify-between">
                  <span>Data/Hora:</span>
                  <span>{new Date().toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mesa/Comanda:</span>
                  <span className="font-bold">
                    {saleType === 'dine_in' ? tableNumber || 'Balcão' : 'Retirada / Entrega'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operador:</span>
                  <span>{currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span>{selectedCustomer.name}</span>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-2">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-baseline text-[11px]">
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="font-bold">{item.quantity}x</span> {item.productName}
                      {item.notes && (
                        <span className="block text-[10px] text-stone-500 italic">
                          ({item.notes})
                        </span>
                      )}
                    </div>
                    <div className="font-bold shrink-0">{formatCurrency(item.total)}</div>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.gross)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                {totals.additional > 0 && (
                  <div className="flex justify-between">
                    <span>Acréscimos:</span>
                    <span>+{formatCurrency(totals.additional)}</span>
                  </div>
                )}
                {totals.delivery > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega:</span>
                    <span>+{formatCurrency(totals.delivery)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-stone-400">
                  <span>TOTAL A PAGAR:</span>
                  <span>{formatCurrency(totals.final)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 pt-0.5">
                  <span>Sugestão de Serviço (10%):</span>
                  <span>{formatCurrency(totals.final * 0.1)}</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="p-3 bg-stone-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPreBillModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-stone-200 text-stone-800 hover:bg-stone-300"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  document.body.classList.add('print-receipt-mode');
                  setTimeout(() => {
                    window.print();
                    setIsPreBillModalOpen(false);
                    setTimeout(() => {
                      document.body.classList.remove('print-receipt-mode');
                    }, 500);
                  }, 100);
                }}
                className="flex-2 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Pré-Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CONFIRMAÇÃO DE LIMPAR PEDIDO */}
      {isClearCartConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-5 text-white space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-slate-700">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base">Limpar Pedido?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Todos os produtos adicionados à comanda atual serão removidos.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearCartConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-stone-300 hover:bg-slate-700"
              >
                Não, manter
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white"
              >
                Sim, limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: CONFIRMAÇÃO DE CANCELAR VENDA */}
      {isCancelSaleConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-5 text-white space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto border border-rose-800">
              <X className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base">Cancelar Venda Atual?</h4>
              <p className="text-xs text-stone-400 mt-1">
                A venda será abortada e os dados do caixa serão reiniciados para novo atendimento.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCancelSaleConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-stone-300 hover:bg-slate-700"
              >
                Voltar à Venda
              </button>
              <button
                type="button"
                onClick={cancelSale}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-rose-700 hover:bg-rose-600 text-white"
              >
                Cancelar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCESSO: TALÃO FISCAL EMITIDO */}
      {completedFiscalDoc && (
        <InvoiceTicketModal
          document={completedFiscalDoc}
          company={company}
          currentUser={currentUser.name}
          onClose={() => setCompletedFiscalDoc(null)}
        />
      )}

      {/* AVISO: VENDA REGISTRADA COM FATURAÇÃO PENDENTE */}
      {completedPendingSaleNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-700 space-y-4 text-white">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                Venda Registrada - Faturamento Pendente
              </h3>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                {completedPendingSaleNotice}
              </p>
              <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 text-left">
                <strong>Nota Fiscal:</strong> O comprovante foi salvo na base local.
                Poderá tentar novamente o envio no menu <em>Faturas</em> assim que a conexão com a API certificada for restabelecida.
              </div>
            </div>
            <button
              onClick={() => setCompletedPendingSaleNotice(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
