import React, { useState, useEffect, useRef } from 'react';
import { FiscalDocument, CompanyInfo } from '../types';
import { formatCurrency, formatDateTime, getDocumentTypeLabel } from '../lib/formatters';
import {
  Printer,
  Mail,
  X,
  CheckCircle,
  ShieldCheck,
  Download,
  Share2,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Globe,
  Monitor,
} from 'lucide-react';
import { api } from '../lib/api';
import { APP_CONFIG } from '../lib/config';
import { generateFiscalDocumentPdf } from '../lib/pdfGenerator';
import { generateFiscalDocumentCanvas } from '../lib/ticketImageGenerator';

interface InvoiceTicketModalProps {
  document: FiscalDocument;
  company: CompanyInfo;
  onClose: () => void;
  currentUser: string;
}

export const InvoiceTicketModal: React.FC<InvoiceTicketModalProps> = ({
  document: initialDoc,
  company,
  onClose,
  currentUser,
}) => {
  const [doc, setDoc] = useState<FiscalDocument>(initialDoc);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Painéis ativos: 'none' | 'whatsapp' | 'download_options' | 'email'
  const [activePanel, setActivePanel] = useState<'none' | 'whatsapp' | 'download_options' | 'email'>('none');

  // WhatsApp State
  const [phoneInput, setPhoneInput] = useState<string>(() => {
    return initialDoc.customerPhone || '';
  });
  const [countryCode, setCountryCode] = useState<string>('55'); // 55 = Brasil, 351 = Portugal
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedAtcud, setCopiedAtcud] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<'web' | 'app'>(() => {
    if (typeof navigator !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      return isMobile ? 'app' : 'web';
    }
    return 'web';
  });

  // E-mail State
  const [emailInput, setEmailInput] = useState(initialDoc.customerEmail || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('print-receipt-mode');
    return () => {
      document.body.classList.remove('print-receipt-mode');
    };
  }, []);

  useEffect(() => {
    setDoc(initialDoc);
    if (initialDoc.customerPhone && !phoneInput) {
      setPhoneInput(initialDoc.customerPhone);
    }
    if (initialDoc.customerEmail && !emailInput) {
      setEmailInput(initialDoc.customerEmail);
    }
  }, [initialDoc]);

  // Exibir avisos temporários
  const showFeedback = (message: string, type: 'success' | 'info' | 'error' = 'success', duration = 4500) => {
    setFeedbackNotice({ type, message });
    setTimeout(() => {
      setFeedbackNotice((curr) => (curr?.message === message ? null : curr));
    }, duration);
  };

  // Sanitizador do telefone para URL do WhatsApp
  const sanitizePhoneNumber = (raw: string): string => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) return '';

    // Se já começar com DDI completo (ex: 5511999999999 ou 351912345678)
    if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
      return digitsOnly;
    }
    if (digitsOnly.startsWith('351') && digitsOnly.length >= 12) {
      return digitsOnly;
    }

    // Se for número brasileiro com DDD (10 ou 11 dígitos)
    if (countryCode === '55' && (digitsOnly.length === 10 || digitsOnly.length === 11)) {
      return `55${digitsOnly}`;
    }

    // Se for número português (9 dígitos)
    if (countryCode === '351' && digitsOnly.length === 9) {
      return `351${digitsOnly}`;
    }

    // Caso já tenha prefixo escolhido
    return `${countryCode}${digitsOnly}`;
  };

  // URL pública do PDF no backend
  const getPdfOnlineUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/api/invoicing/documents/${doc.id}/pdf`;
  };

  // Gerador de mensagem formatada para o WhatsApp (com o PDF da nota)
  const generateWhatsAppMessage = () => {
    const compName = company.name || APP_CONFIG.appName;
    const docTypeLabel = getDocumentTypeLabel(doc.documentType);
    const dateFormatted = formatDateTime(doc.issuedAt);
    const pdfUrl = getPdfOnlineUrl();

    const itemsSummary = doc.items
      .map((it) => `• ${it.quantity}x ${it.productName} — ${formatCurrency(it.total)}`)
      .join('\n');

    const paymentMethods = doc.payments
      .map((p) => {
        const methodLabel =
          p.method === 'cartao'
            ? 'Cartão Débito/Crédito'
            : p.method === 'mbway'
            ? 'Pix / MB Way'
            : p.method.toUpperCase();
        return `${methodLabel}: ${formatCurrency(p.amount)}`;
      })
      .join(', ');

    return `🧾 *COMPROVANTE FISCAL ELETRÔNICO*
*${compName}*
${company.legalName || APP_CONFIG.company.legalName}
CNPJ/CPF: ${company.nif}
${company.address ? `Endereço: ${company.address}\n` : ''}
───────────────────
📄 *${docTypeLabel}:* ${doc.documentNumber}
📅 *Data/Hora:* ${dateFormatted}
👤 *Cliente:* ${doc.customerName}
💳 *CPF/CNPJ:* ${doc.customerNif}
───────────────────
🛒 *ITENS DO PEDIDO:*
${itemsSummary}
───────────────────
${doc.totals.discountTotal > 0 ? `Desconto: -${formatCurrency(doc.totals.discountTotal)}\n` : ''}Tributos Totais: ${formatCurrency(doc.totals.taxTotal)}
💵 *TOTAL A PAGAR: ${formatCurrency(doc.totals.finalTotal)}*
💳 *Pagamento:* ${paymentMethods}
───────────────────
🔐 *Chave de Validação (ATCUD):*
${doc.atcud}
Software Certificado nº ${doc.certifiedSoftwareNumber}

📎 *Acesse ou baixe o PDF oficial da Nota Fiscal:*
${pdfUrl}

Agradecemos a sua preferência!`;
  };

  // Função central para baixar o PDF da Nota Fiscal
  const handleDownloadPdf = async (autoSilent = false) => {
    setIsDownloading(true);
    try {
      // Gera o PDF de alta fidelidade
      const pdf = generateFiscalDocumentPdf(doc, company);
      const cleanDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');
      const filename = `Nota_Fiscal_${cleanDocNum}.pdf`;

      // Dispara o download no navegador
      pdf.save(filename);

      if (!autoSilent) {
        showFeedback(`Nota Fiscal baixada com sucesso: ${filename}!`, 'success');
      }

      return pdf;
    } catch (err) {
      console.error('Erro ao gerar PDF localmente:', err);
      // Fallback via endpoint do servidor
      window.open(`/api/invoicing/documents/${doc.id}/download`, '_blank');
      showFeedback('Download do PDF iniciado pelo servidor.', 'info');
      return null;
    } finally {
      setIsDownloading(false);
    }
  };

  // Função central para Imprimir o comprovante fiscal
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // 1. Registra no backend para auditoria e controle de 2ª via
      const res = await api.recordPrintDocument(doc.id, currentUser);
      if (res.document) {
        setDoc(res.document);
      }

      showFeedback('Enviando para a impressora...', 'info', 2000);

      // 2. Dispara a impressão do navegador
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
        showFeedback('Impressão solicitada com sucesso!', 'success');
      }, 100);
    } catch (err) {
      console.error('Erro ao registrar impressão:', err);
      window.print();
      setIsPrinting(false);
    }
  };

  // ENVIAR O PDF DA NOTA PARA O WHATSAPP DO CLIENTE (COM SUPORTE A WHATSAPP WEB E APP)
  const handleSendWhatsAppWithPdf = async (forcedTarget?: 'web' | 'app') => {
    const targetToUse = forcedTarget || whatsappTarget;
    setIsSendingWhatsApp(true);
    const cleanDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');
    const filename = `Nota_Fiscal_${cleanDocNum}.pdf`;
    const message = generateWhatsAppMessage();
    const cleanPhone = sanitizePhoneNumber(phoneInput);

    try {
      // 1. Gera o PDF oficial em Blob/File
      const pdf = generateFiscalDocumentPdf(doc, company);
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // 2. Se for modo App e estiver em dispositivo móvel com suporte a Web Share API nativa de arquivos
      if (
        targetToUse === 'app' &&
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        try {
          await navigator.share({
            title: `Nota Fiscal ${doc.documentNumber} - ${company.name}`,
            text: message,
            files: [pdfFile],
          });

          // Registra log no servidor
          await api.whatsappDocument(doc.id, cleanPhone || 'Compartilhamento Mobile', currentUser);
          showFeedback('PDF da Nota Fiscal compartilhado com sucesso no WhatsApp!', 'success');
          setIsSendingWhatsApp(false);
          return;
        } catch (shareErr: any) {
          // Se o usuário cancelou o menu nativo, continua para o fluxo normal de abertura por link
          if (shareErr.name === 'AbortError') {
            setIsSendingWhatsApp(false);
            return;
          }
        }
      }

      // 3. No Desktop / WhatsApp Web: Baixa automaticamente o arquivo PDF para o usuário anexar na conversa
      // e inclui o link direto para download na mensagem
      pdf.save(filename);

      // 4. Monta a URL apropriada
      let waUrl = '';
      if (targetToUse === 'web') {
        // Abre o WhatsApp Web diretamente no navegador (perfeito para quem não tem o App instalado no desktop)
        if (cleanPhone) {
          waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        } else {
          waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        }
      } else {
        // Abre o WhatsApp App padrão (desktop ou celular)
        if (cleanPhone) {
          waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        } else {
          waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        }
      }

      // 5. Registra no backend
      await api.whatsappDocument(
        doc.id,
        cleanPhone ? `${cleanPhone} (${targetToUse === 'web' ? 'WhatsApp Web' : 'WhatsApp App'})` : 'WhatsApp Aberto',
        currentUser
      );

      // 6. Abre o WhatsApp com a mensagem e o link do PDF
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      if (targetToUse === 'web') {
        showFeedback(
          `PDF baixado! WhatsApp Web aberto no navegador para anexar o arquivo "${filename}".`,
          'success',
          6500
        );
      } else {
        showFeedback(
          `PDF baixado! WhatsApp aberto. Caso não tenha o App instalado no desktop, utilize a opção "WhatsApp Web".`,
          'success',
          6500
        );
      }
    } catch (err) {
      console.error('Erro ao enviar PDF via WhatsApp:', err);
      // Fallback para envio do link com mensagem
      let waUrl = '';
      if (targetToUse === 'web') {
        waUrl = cleanPhone
          ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      } else {
        waUrl = cleanPhone
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      }
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      showFeedback('WhatsApp aberto com os dados e link do PDF da Nota.', 'info');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Baixar em Imagem PNG (Renderização direta em Canvas 2D sem conflito de CSS oklch)
  const handleDownloadPng = async () => {
    setIsDownloading(true);

    try {
      const canvas = generateFiscalDocumentCanvas(doc, company);
      const imgData = canvas.toDataURL('image/png');
      const cleanDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');
      const filename = `Cupom_Fiscal_${cleanDocNum}.png`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showFeedback(`Imagem "${filename}" baixada com sucesso!`, 'success');
    } catch (err: any) {
      console.error('Erro ao baixar imagem:', err);
      showFeedback('Não foi possível gerar a imagem. Tente baixar em PDF.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Baixar em Texto Puro TXT
  const handleDownloadTxt = () => {
    const cleanDocNum = doc.documentNumber.replace(/[\/\s\\:]/g, '_');
    const filename = `Cupom_Fiscal_${cleanDocNum}.txt`;

    const txtContent = `${'='.repeat(40)}
${(company.name || APP_CONFIG.appName).toUpperCase().padStart(20 + (company.name || APP_CONFIG.appName).length / 2)}
${(company.legalName || APP_CONFIG.company.legalName).padStart(20 + (company.legalName || APP_CONFIG.company.legalName).length / 2)}
CNPJ/CPF: ${company.nif}
${company.address || APP_CONFIG.demoAddress.street}
CEP: ${company.postalCode || APP_CONFIG.demoAddress.postalCode} - ${company.city || APP_CONFIG.demoAddress.city}
Tel: ${company.phone || APP_CONFIG.company.phone}
${'='.repeat(40)}
${getDocumentTypeLabel(doc.documentType).toUpperCase()}: ${doc.documentNumber}
Data/Hora: ${formatDateTime(doc.issuedAt)}
Operador: ${doc.operatorName}
Cliente: ${doc.customerName}
CPF/CNPJ: ${doc.customerNif}
${'-'.repeat(40)}
DESCRIÇÃO                QTD  TRIB.    TOTAL
${'-'.repeat(40)}
${doc.items
  .map(
    (it) =>
      `${it.productName.slice(0, 22).padEnd(23)} ${String(it.quantity).padStart(3)}  ${String(it.ivaRate).padStart(2)}%  ${formatCurrency(it.total).padStart(8)}`
  )
  .join('\n')}
${'-'.repeat(40)}
Total Bruto:                     ${formatCurrency(doc.totals.grossTotal).padStart(11)}
${doc.totals.discountTotal > 0 ? `Desconto:                       -${formatCurrency(doc.totals.discountTotal).padStart(10)}\n` : ''}Tributos Totais:                 ${formatCurrency(doc.totals.taxTotal).padStart(11)}
TOTAL A PAGAR:                   ${formatCurrency(doc.totals.finalTotal).padStart(11)}
${'-'.repeat(40)}
PAGAMENTO:
${doc.payments.map((p) => `• ${p.method.toUpperCase()}: ${formatCurrency(p.amount)}`).join('\n')}
${'-'.repeat(40)}
CHAVE DE VALIDAÇÃO (ATCUD):
${doc.atcud}
Assinatura: ${doc.signatureHash}
Certificação AT: nº ${doc.certifiedSoftwareNumber}
${'='.repeat(40)}
Obrigado pela preferência!
`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    showFeedback(`Arquivo texto "${filename}" baixado com sucesso!`, 'success');
  };

  // Copiar mensagem para área de transferência
  const handleCopyMessage = async () => {
    try {
      const message = generateWhatsAppMessage();
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
      showFeedback('Mensagem copiada para a área de transferência!', 'success');
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
    }
  };

  // Copiar ATCUD
  const handleCopyAtcud = async () => {
    try {
      await navigator.clipboard.writeText(doc.atcud);
      setCopiedAtcud(true);
      setTimeout(() => setCopiedAtcud(false), 2000);
      showFeedback('Chave ATCUD copiada!', 'info');
    } catch (err) {
      console.error('Falha ao copiar ATCUD:', err);
    }
  };

  // Enviar por E-mail
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setIsSendingEmail(true);
    try {
      const res = await api.emailDocument(doc.id, emailInput, currentUser);
      if (res.success) {
        showFeedback(`Comprovante fiscal enviado com sucesso para ${emailInput}!`, 'success');
        setActivePanel('none');
      } else {
        showFeedback('Falha ao enviar e-mail. Verifique o endereço digitado.', 'error');
      }
    } catch (err) {
      showFeedback('Erro ao comunicar com o servidor de e-mail.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs overflow-hidden">
      {/* Container Principal do Modal - Totalmente Responsivo Desktop e Mobile */}
      <div className="relative w-full max-w-lg max-h-[96vh] sm:max-h-[92vh] flex flex-col bg-stone-900 rounded-2xl shadow-2xl border border-stone-800 overflow-hidden text-stone-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* TOPO / HEADER FIXO */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-stone-900 border-b border-stone-800 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-stone-100 truncate">
                  Nota Fiscal Eletrônica
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {doc.documentNumber}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 truncate">
                {getDocumentTypeLabel(doc.documentType)} &bull; Certificado nº {doc.certifiedSoftwareNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK NOTICE BANNER (SE ATIVO) */}
        {feedbackNotice && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 border-b shrink-0 print:hidden transition-all animate-in slide-in-from-top-1 ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/50'
                : feedbackNotice.type === 'error'
                ? 'bg-rose-950/80 text-rose-200 border-rose-700/50'
                : 'bg-sky-950/80 text-sky-200 border-sky-700/50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{feedbackNotice.message}</span>
            </div>
            <button
              onClick={() => setFeedbackNotice(null)}
              className="text-stone-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BARRA DE AÇÕES PRINCIPAIS (IMPRIMIR, BAIXAR NOTA, WHATSAPP COM PDF) */}
        <div className="px-3 sm:px-5 py-2.5 bg-stone-950/90 border-b border-stone-800/80 shrink-0 print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            
            {/* 1. IMPRIMIR NOTA */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Imprimir cupom fiscal diretamente (80mm)"
            >
              <Printer className="w-4 h-4 shrink-0 text-stone-950" />
              <span className="truncate">
                {isPrinting ? 'A imprimir...' : doc.printCount > 0 ? '2ª Via' : 'Imprimir'}
              </span>
            </button>

            {/* 2. BAIXAR NOTA (Baixa diretamente o PDF com 1 clique) */}
            <div className="relative flex">
              <button
                type="button"
                onClick={() => handleDownloadPdf(false)}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-2 rounded-l-xl text-xs font-bold transition-all bg-sky-600 hover:bg-sky-500 text-white shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Baixar Nota Fiscal em PDF Oficial"
              >
                <Download className="w-4 h-4 shrink-0 text-white" />
                <span className="truncate">
                  {isDownloading ? 'Baixando...' : 'Baixar'}
                </span>
              </button>
              {/* Botão de Opções adicionais de download */}
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'download_options' ? 'none' : 'download_options')}
                className="px-1.5 py-2 rounded-r-xl bg-sky-700 hover:bg-sky-600 text-white border-l border-sky-500/50 flex items-center justify-center transition-colors cursor-pointer"
                title="Mais opções de formato (PNG, TXT)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. ENVIAR PARA O WHATSAPP COM PDF */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === 'whatsapp' ? 'none' : 'whatsapp')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
                activePanel === 'whatsapp'
                  ? 'bg-[#25D366] text-stone-950 border-[#25D366]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
              title="Enviar PDF e dados da Nota pelo WhatsApp Web ou App"
            >
              {whatsappTarget === 'web' ? <Globe className="w-4 h-4 shrink-0" /> : <Smartphone className="w-4 h-4 shrink-0" />}
              <span className="truncate">WhatsApp</span>
            </button>

            {/* 4. E-MAIL */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === 'email' ? 'none' : 'email')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
                activePanel === 'email'
                  ? 'bg-stone-700 text-white border-stone-600'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
              title="Enviar comprovante por e-mail"
            >
              <Mail className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">E-mail</span>
            </button>
          </div>
        </div>

        {/* PAINÉIS EXPANSÍVEIS (WHATSAPP COM PDF, OPÇÕES DE DOWNLOAD, E-MAIL) */}

        {/* 1. Painel WhatsApp com Envio de PDF da Nota */}
        {activePanel === 'whatsapp' && (
          <div className="p-3.5 sm:p-4 bg-emerald-950/50 border-b border-emerald-500/30 text-stone-200 shrink-0 space-y-3 print:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#25D366] text-stone-950 flex items-center justify-center font-black text-xs shadow-xs">
                  WA
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Enviar PDF da Nota para o WhatsApp</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      PDF Anexo + Link
                    </span>
                  </h4>
                  <p className="text-[10px] text-emerald-300/80">
                    Gera e anexa o arquivo PDF da nota fiscal diretamente na conversa com o cliente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePanel('none')}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input do Telefone do Cliente */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-300">
                Número de WhatsApp do Cliente:
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-stone-800 text-stone-200 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shrink-0"
                >
                  <option value="55">🇧🇷 +55 (Brasil)</option>
                  <option value="351">🇵🇹 +351 (Portugal)</option>
                  <option value="">Outro País</option>
                </select>

                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Ex: 11 98765-4321 ou 912 345 678"
                  className="flex-1 bg-stone-800 text-white placeholder-stone-400 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>Cliente: <strong className="text-stone-200">{doc.customerName}</strong> (CPF/CNPJ: {doc.customerNif})</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>Nota_Fiscal_{doc.documentNumber.replace(/[\/\s]/g, '_')}.pdf</span>
                </span>
              </div>
            </div>

            {/* Seletor de Destino: WhatsApp Web (Navegador) vs WhatsApp App */}
            <div className="bg-stone-900/90 p-2.5 sm:p-3 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-200 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Como prefere abrir no seu dispositivo?</span>
                </span>
                <span className="text-[10px] text-emerald-400/90 font-medium">
                  {whatsappTarget === 'web' ? 'Navegador Web' : 'Aplicativo Instalado'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsappTarget('web')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    whatsappTarget === 'web'
                      ? 'bg-[#25D366] text-stone-950 border-[#25D366] shadow-sm font-extrabold'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>WhatsApp Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatsappTarget('app')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    whatsappTarget === 'app'
                      ? 'bg-[#25D366] text-stone-950 border-[#25D366] shadow-sm font-extrabold'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>App WhatsApp</span>
                </button>
              </div>

              <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                {whatsappTarget === 'web' ? (
                  <span>
                    💡 <strong>Recomendado para PC:</strong> Abre diretamente no <strong>WhatsApp Web</strong> no navegador, ideal caso você <strong>não tenha o aplicativo instalado no desktop</strong>.
                  </span>
                ) : (
                  <span>
                    💡 Abre o <strong>aplicativo instalado</strong> no Windows/Mac ou o WhatsApp nativo em celulares.
                  </span>
                )}
              </p>
            </div>

            {/* Ações do WhatsApp */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Principal Dinâmico */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppWithPdf(whatsappTarget)}
                  disabled={isSendingWhatsApp}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-stone-950 font-extrabold text-xs transition-colors shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {whatsappTarget === 'web' ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  <span>
                    {isSendingWhatsApp
                      ? 'Gerando PDF e abrindo...'
                      : whatsappTarget === 'web'
                      ? 'Enviar via WhatsApp Web'
                      : 'Enviar no App WhatsApp'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>

                {/* Botão Atalho para WhatsApp Web se estiver em modo App */}
                {whatsappTarget === 'app' && (
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppWithPdf('web')}
                    disabled={isSendingWhatsApp}
                    className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs border border-emerald-600 transition-colors cursor-pointer"
                    title="Abrir diretamente no WhatsApp Web no navegador (caso não tenha o App)"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Abrir Web</span>
                  </button>
                )}

                {/* Botão Baixar PDF Separado */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(false)}
                  className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 transition-colors cursor-pointer"
                  title="Baixar arquivo PDF no dispositivo"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Baixar PDF</span>
                </button>

                {/* Botão Copiar Mensagem com Link */}
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 transition-colors cursor-pointer"
                  title="Copiar mensagem completa e link do PDF"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dica de rodapé do WhatsApp */}
              <div className="flex items-center justify-between text-[10px] text-stone-400 px-1">
                <span>
                  O PDF é baixado automaticamente para você poder arrastar ou anexar na conversa do WhatsApp.
                </span>
                {whatsappTarget === 'app' && (
                  <button
                    type="button"
                    onClick={() => setWhatsappTarget('web')}
                    className="text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                  >
                    Sem app no PC? Mudar para WhatsApp Web
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Painel de Opções Adicionais de Download (PDF, Imagem, Texto) */}
        {activePanel === 'download_options' && (
          <div className="p-3.5 sm:p-4 bg-sky-950/50 border-b border-sky-500/30 text-stone-200 shrink-0 space-y-3 print:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Formatos de Download da Nota Fiscal
                  </h4>
                  <p className="text-[10px] text-sky-300/80">
                    O PDF já é baixado por padrão. Se desejar, escolha outros formatos abaixo:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePanel('none')}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Opção PDF */}
              <button
                type="button"
                onClick={() => handleDownloadPdf(false)}
                disabled={isDownloading}
                className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1.5 p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-sky-500/40 text-left sm:text-center transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs text-white">
                    {isDownloading ? 'Gerando...' : 'Baixar PDF Oficial'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Formato térmico 80mm
                  </span>
                </div>
              </button>

              {/* Opção Imagem PNG */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isDownloading}
                className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1.5 p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-left sm:text-center transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs text-white">
                    Baixar Imagem
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Arquivo PNG nítido
                  </span>
                </div>
              </button>

              {/* Opção Texto TXT */}
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1.5 p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-left sm:text-center transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs text-white">
                    Baixar Texto
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Cupom 40 colunas (.txt)
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 3. Painel E-mail */}
        {activePanel === 'email' && (
          <form
            onSubmit={handleSendEmail}
            className="p-3.5 sm:p-4 bg-stone-800/80 border-b border-stone-700 text-stone-200 shrink-0 space-y-3 print:hidden animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Enviar Comprovante por E-mail
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    O cliente receberá uma cópia com os dados fiscais e link para o PDF.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('none')}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="cliente@exemplo.com.br"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-stone-900 text-white placeholder-stone-400 border border-stone-700 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isSendingEmail}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isSendingEmail ? 'Enviando...' : 'Enviar E-mail'}
              </button>
            </div>
          </form>
        )}

        {/* ÁREA DE ROLAGEM RESPONSIVA DO CUPOM TÉRMICO */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-5 bg-stone-950/60 select-text">
          
          {/* O TALÃO IMPRESSÍVEL (id="printable-ticket") */}
          <div
            ref={ticketRef}
            id="printable-ticket"
            className="w-full max-w-[390px] mx-auto bg-white text-stone-900 rounded-xl p-4 sm:p-6 shadow-xl border border-stone-200 font-mono text-xs leading-relaxed transition-all"
          >
            {/* Alerta de 2ª Via se reimpresso */}
            {(doc.isSecondCopy || doc.printCount > 1) && (
              <div className="text-center py-1 mb-2 border border-dashed border-stone-400 font-sans font-bold text-[10px] text-stone-600 tracking-wider uppercase">
                2ª VIA / CÓPIA DE CONSULTA
              </div>
            )}

            {doc.status === 'anulado' && (
              <div className="text-center py-1.5 mb-2 bg-red-100 border border-red-300 text-red-800 font-sans font-bold text-xs tracking-wider">
                DOCUMENTO ANULADO / ESTORNADO
              </div>
            )}

            {/* Cabeçalho da Empresa */}
            <div className="text-center pb-3 border-b border-dashed border-stone-300">
              <h1 className="font-sans font-extrabold text-sm sm:text-base tracking-wide text-stone-950 uppercase">
                {company.name || APP_CONFIG.appName}
              </h1>
              <p className="text-[11px] font-sans text-stone-600 leading-tight mt-0.5">
                {company.legalName || APP_CONFIG.company.legalName}
              </p>
              <p className="text-[11px] font-semibold text-stone-800 mt-1">
                CNPJ/CPF: <span className="font-bold">{company.nif}</span>
              </p>
              <p className="text-[10px] text-stone-600 mt-0.5">
                {company.address || APP_CONFIG.demoAddress.street}
              </p>
              <p className="text-[10px] text-stone-600">
                CEP {company.postalCode || APP_CONFIG.demoAddress.postalCode} - {company.city || APP_CONFIG.demoAddress.city}
              </p>
              <div className="my-1.5 py-0.5 px-2 bg-stone-100 rounded text-[9px] text-stone-600 border border-stone-200">
                * {APP_CONFIG.demoAddress.notice}
              </div>
              <p className="text-[10px] text-stone-600">
                Tel: {company.phone || APP_CONFIG.company.phone}
              </p>
              <p className="text-[9px] text-stone-500 mt-0.5">
                Cap. Social: {company.shareCapital || APP_CONFIG.company.shareCapital}
              </p>
            </div>

            {/* Dados do Documento Fiscal */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1">
              <div className="flex justify-between items-center font-bold text-xs sm:text-[13px] text-stone-950">
                <span className="uppercase">{getDocumentTypeLabel(doc.documentType)}</span>
                <span className="font-mono bg-stone-100 px-1 rounded">{doc.documentNumber}</span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-600">
                <span>Data/Hora:</span>
                <span>{formatDateTime(doc.issuedAt)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-600">
                <span>Operador:</span>
                <span>{doc.operatorName}</span>
              </div>
              {doc.rectifiedByNC && (
                <div className="text-red-600 text-[10px] font-bold">
                  Retificado por: {doc.rectifiedByNC}
                </div>
              )}
            </div>

            {/* Dados do Cliente */}
            <div className="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Cliente:</span>
                <span className="font-semibold text-stone-900 truncate max-w-[200px] text-right">
                  {doc.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">CPF/CNPJ:</span>
                <span className="font-bold text-stone-900">{doc.customerNif}</span>
              </div>
              {doc.customerPhone && (
                <div className="flex justify-between text-[10px] text-stone-600">
                  <span className="text-stone-500">Telefone/WhatsApp:</span>
                  <span>{doc.customerPhone}</span>
                </div>
              )}
              {doc.customerAddress && (
                <div className="text-stone-600 text-[10px] truncate text-right">
                  {doc.customerAddress}
                </div>
              )}
            </div>

            {/* Tabela de Itens */}
            <div className="py-2.5 border-b border-dashed border-stone-300">
              <div className="flex justify-between text-[10px] text-stone-500 uppercase font-bold mb-1.5 pb-1 border-b border-stone-200">
                <span className="flex-1 min-w-0 pr-2">Descrição</span>
                <span className="w-10 text-center shrink-0">Qtd</span>
                <span className="w-12 text-right shrink-0">Trib.</span>
                <span className="w-16 sm:w-20 text-right shrink-0">Total</span>
              </div>
              <div className="space-y-1.5">
                {doc.items.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between text-[11px] leading-tight">
                    <div className="flex-1 min-w-0 pr-2 font-sans font-medium text-stone-900 break-words">
                      {it.productName}
                      {it.notes ? (
                        <span className="block text-[9px] text-stone-500 italic">({it.notes})</span>
                      ) : null}
                    </div>
                    <div className="w-10 text-center text-stone-700 shrink-0 font-mono">
                      {it.quantity}
                    </div>
                    <div className="w-12 text-right text-stone-600 shrink-0 font-mono text-[10px]">
                      {it.ivaRate}%
                    </div>
                    <div className="w-16 sm:w-20 text-right font-medium text-stone-950 shrink-0 font-mono">
                      {formatCurrency(it.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalhamento Tributário */}
            <div className="py-2.5 border-b border-dashed border-stone-300 text-[10px]">
              <div className="font-bold text-stone-700 mb-1">Detalhamento Tributário:</div>
              <div className="grid grid-cols-4 text-stone-500 border-b border-stone-200 pb-1 mb-1 font-semibold">
                <span>Alíquota</span>
                <span className="text-right">Base Calc.</span>
                <span className="text-right">Imposto</span>
                <span className="text-right">Total</span>
              </div>
              {doc.totals.ivaBreakdown.map((row, idx) => (
                <div key={idx} className="grid grid-cols-4 text-stone-700 py-0.5">
                  <span>
                    {row.rate}% ({row.code})
                  </span>
                  <span className="text-right">{formatCurrency(row.base)}</span>
                  <span className="text-right">{formatCurrency(row.amount)}</span>
                  <span className="text-right">{formatCurrency(row.base + row.amount)}</span>
                </div>
              ))}
            </div>

            {/* Totais do Documento */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1">
              <div className="flex justify-between text-[11px] text-stone-600">
                <span>Total Bruto:</span>
                <span>{formatCurrency(doc.totals.grossTotal)}</span>
              </div>
              {doc.totals.discountTotal > 0 && (
                <div className="flex justify-between text-[11px] text-amber-700">
                  <span>Descontos:</span>
                  <span>-{formatCurrency(doc.totals.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-stone-600">
                <span>Tributos Totais:</span>
                <span>{formatCurrency(doc.totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-extrabold text-stone-950 pt-1 font-sans border-t border-stone-200">
                <span>TOTAL A PAGAR:</span>
                <span>{formatCurrency(doc.totals.finalTotal)}</span>
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div className="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
              <span className="text-[10px] text-stone-500 uppercase font-bold block mb-1">
                Forma de Pagamento:
              </span>
              {doc.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="capitalize">
                    {p.method === 'cartao'
                      ? 'Cartão Débito/Crédito'
                      : p.method === 'mbway'
                      ? 'Pix / MB Way'
                      : p.method}
                  </span>
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {doc.payments.find((p) => p.tendered !== undefined && p.change !== undefined) && (
                <>
                  <div className="flex justify-between text-stone-500 text-[10px] pt-1">
                    <span>Valor Pago:</span>
                    <span>
                      {formatCurrency(doc.payments.find((p) => p.tendered)?.tendered)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-800 text-[11px] font-bold">
                    <span>Troco:</span>
                    <span>
                      {formatCurrency(doc.payments.find((p) => p.change)?.change)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* QR Code & Chave de Autenticação ATCUD */}
            <div className="pt-3 text-center space-y-2">
              <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-stone-950 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 max-w-full">
                <span>CHAVE DE VALIDAÇÃO:</span>
                <span className="font-mono text-xs">{doc.atcud}</span>
                <button
                  type="button"
                  onClick={handleCopyAtcud}
                  className="p-1 hover:text-amber-600 text-stone-500 print:hidden transition-colors cursor-pointer"
                  title="Copiar Chave ATCUD"
                >
                  {copiedAtcud ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* QR Code SVG Oficial e Nítido */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="p-2.5 bg-white border border-stone-300 rounded-lg shadow-xs inline-block">
                  <svg
                    className="w-28 h-28 sm:w-32 sm:h-32"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="100" height="100" fill="white" />
                    {/* Corner 1 */}
                    <rect x="8" y="8" width="28" height="28" fill="#1c1917" />
                    <rect x="12" y="12" width="20" height="20" fill="white" />
                    <rect x="16" y="16" width="12" height="12" fill="#1c1917" />
                    {/* Corner 2 */}
                    <rect x="64" y="8" width="28" height="28" fill="#1c1917" />
                    <rect x="68" y="12" width="20" height="20" fill="white" />
                    <rect x="72" y="16" width="12" height="12" fill="#1c1917" />
                    {/* Corner 3 */}
                    <rect x="8" y="64" width="28" height="28" fill="#1c1917" />
                    <rect x="12" y="68" width="20" height="20" fill="white" />
                    <rect x="16" y="72" width="12" height="12" fill="#1c1917" />
                    {/* Data modules */}
                    <rect x="42" y="12" width="6" height="6" fill="#1c1917" />
                    <rect x="52" y="20" width="6" height="6" fill="#1c1917" />
                    <rect x="42" y="42" width="16" height="16" fill="#1c1917" />
                    <rect x="46" y="46" width="8" height="8" fill="white" />
                    <rect x="64" y="42" width="6" height="12" fill="#1c1917" />
                    <rect x="76" y="52" width="16" height="6" fill="#1c1917" />
                    <rect x="42" y="72" width="12" height="6" fill="#1c1917" />
                    <rect x="68" y="72" width="20" height="16" fill="#1c1917" />
                    <rect x="54" y="60" width="6" height="6" fill="#1c1917" />
                  </svg>
                </div>
                <span className="text-[9px] text-stone-500 mt-1 font-sans">
                  QR Code de Consulta de Autenticidade Fiscal
                </span>
              </div>

              <div className="text-[9px] text-stone-500 leading-tight">
                {doc.signatureHash} - Emitido por {APP_CONFIG.appName} Sistema Fiscal Eletrônico
              </div>

              <div className="text-[10px] font-sans font-semibold text-stone-800 pt-1">
                Agradecemos a sua preferência!
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ FIXO INFERIOR */}
        <div className="p-2.5 sm:p-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="text-[11px] text-stone-400 hidden sm:block">
            {doc.printCount > 0 ? (
              <span>Documento já impresso ({doc.printCount}x)</span>
            ) : (
              <span>Pronto para impressão, download ou envio</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
            {/* WhatsApp com PDF */}
            <button
              onClick={() => setActivePanel('whatsapp')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer"
            >
              {whatsappTarget === 'web' ? <Globe className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>WhatsApp {whatsappTarget === 'web' ? 'Web' : '(PDF)'}</span>
            </button>

            {/* Baixar PDF Direto */}
            <button
              onClick={() => handleDownloadPdf(false)}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Baixando...' : 'Baixar PDF'}</span>
            </button>

            {/* Imprimir */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{doc.printCount > 0 ? 'Reimprimir' : 'Imprimir'}</span>
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
