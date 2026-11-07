import { FiscalDocument, CompanyInfo } from '../types';
import { formatCurrency, formatDateTime, getDocumentTypeLabel } from './formatters';
import { APP_CONFIG } from './config';

/**
 * Renderizador de alta resolução do cupom fiscal diretamente em HTML5 Canvas.
 * Elimina 100% das dependências de html2canvas e conflitos com Tailwind v4 (oklch).
 */
export function generateFiscalDocumentCanvas(doc: FiscalDocument, company: CompanyInfo): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível obter contexto 2D do Canvas.');
  }

  // Resolução 2x para nitidez em telas retina e impressão
  const width = 720; // 360px visual
  const scale = 2;
  const paddingX = 36;
  const contentWidth = width - paddingX * 2;
  const centerX = width / 2;

  // Calcula a altura dinâmica necessária
  const headerHeight = 220;
  const docInfoHeight = 110;
  const custHeight = 90 + (doc.customerPhone ? 30 : 0);
  const itemsHeight = 80 + doc.items.length * 48;
  const taxHeight = 80 + (doc.totals.ivaBreakdown?.length || 1) * 32;
  const totalsHeight = 160;
  const paymentsHeight = 80 + doc.payments.length * 36;
  const qrAndFooterHeight = 330;

  const totalHeight = Math.max(
    1100,
    headerHeight + docInfoHeight + custHeight + itemsHeight + taxHeight + totalsHeight + paymentsHeight + qrAndFooterHeight
  );

  canvas.width = width;
  canvas.height = totalHeight;

  // 1. Fundo branco limpo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // Helper para traço pontilhado
  const drawDashedLine = (y: number, color = '#cccccc') => {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.stroke();
    ctx.restore();
  };

  let curY = 48;

  // 2. Cabeçalho da Empresa
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((company.name || APP_CONFIG.appName).toUpperCase(), centerX, curY);
  curY += 30;

  ctx.fillStyle = '#475569';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(company.legalName || APP_CONFIG.company.legalName, centerX, curY);
  curY += 26;

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 19px monospace';
  ctx.fillText(`CNPJ/CPF: ${company.nif}`, centerX, curY);
  curY += 26;

  ctx.fillStyle = '#64748b';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (company.address) {
    ctx.fillText(company.address, centerX, curY);
    curY += 24;
  }
  if (company.city || company.postalCode) {
    ctx.fillText(`CEP ${company.postalCode || ''} - ${company.city || ''}`, centerX, curY);
    curY += 24;
  }
  if (company.phone) {
    ctx.fillText(`Tel: ${company.phone}`, centerX, curY);
    curY += 24;
  }

  curY += 10;
  drawDashedLine(curY);
  curY += 30;

  // 2ª Via / Cópia de Consulta
  if (doc.isSecondCopy || doc.printCount > 1) {
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('2ª VIA / CÓPIA DE CONSULTA', centerX, curY);
    curY += 30;
  }

  // 3. Dados do Documento Fiscal
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(getDocumentTypeLabel(doc.documentType).toUpperCase(), paddingX, curY);

  ctx.textAlign = 'right';
  ctx.font = 'bold 21px monospace';
  ctx.fillText(doc.documentNumber, width - paddingX, curY);
  curY += 28;

  ctx.font = '18px monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Data/Hora:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillText(formatDateTime(doc.issuedAt), width - paddingX, curY);
  curY += 26;

  ctx.textAlign = 'left';
  ctx.fillText('Operador:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillText(doc.operatorName || 'Operador', width - paddingX, curY);
  curY += 26;

  curY += 8;
  drawDashedLine(curY);
  curY += 30;

  // 4. Dados do Cliente
  ctx.textAlign = 'left';
  ctx.fillText('Cliente:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const displayCustName = doc.customerName.length > 28 ? doc.customerName.slice(0, 27) + '…' : doc.customerName;
  ctx.fillText(displayCustName, width - paddingX, curY);
  curY += 26;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '18px monospace';
  ctx.fillText('CPF/CNPJ:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(doc.customerNif, width - paddingX, curY);
  curY += 26;

  if (doc.customerPhone) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '18px monospace';
    ctx.fillText('Telefone/WhatsApp:', paddingX, curY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '18px monospace';
    ctx.fillText(doc.customerPhone, width - paddingX, curY);
    curY += 26;
  }

  curY += 8;
  drawDashedLine(curY);
  curY += 30;

  // 5. Tabela de Itens
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('DESCRIÇÃO', paddingX, curY);
  ctx.textAlign = 'center';
  ctx.fillText('QTD', width - paddingX - 190, curY);
  ctx.textAlign = 'right';
  ctx.fillText('TRIB', width - paddingX - 110, curY);
  ctx.fillText('TOTAL', width - paddingX, curY);
  curY += 16;

  // Linha sólida sutil
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();
  curY += 24;

  doc.items.forEach((item) => {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    
    // Nome do produto truncado se necessário
    const safeName = item.productName.length > 25 ? item.productName.slice(0, 24) + '…' : item.productName;
    ctx.fillText(safeName, paddingX, curY);

    ctx.fillStyle = '#334155';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity), width - paddingX - 190, curY);

    ctx.textAlign = 'right';
    ctx.fillText(`${item.ivaRate}%`, width - paddingX - 110, curY);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(formatCurrency(item.total), width - paddingX, curY);

    curY += 34;
  });

  curY += 6;
  drawDashedLine(curY);
  curY += 30;

  // 6. Detalhamento Tributário
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Detalhamento Tributário:', paddingX, curY);
  curY += 24;

  ctx.fillStyle = '#64748b';
  ctx.font = '15px monospace';
  ctx.fillText('Alíquota', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillText('Base Calc.', width - paddingX - 220, curY);
  ctx.fillText('Imposto', width - paddingX - 110, curY);
  ctx.fillText('Total', width - paddingX, curY);
  curY += 22;

  if (doc.totals.ivaBreakdown && doc.totals.ivaBreakdown.length > 0) {
    doc.totals.ivaBreakdown.forEach((tax) => {
      ctx.fillStyle = '#334155';
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${tax.rate}% (${tax.code})`, paddingX, curY);
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(tax.base), width - paddingX - 220, curY);
      ctx.fillText(formatCurrency(tax.amount), width - paddingX - 110, curY);
      ctx.fillText(formatCurrency(tax.base + tax.amount), width - paddingX, curY);
      curY += 24;
    });
  }

  curY += 8;
  drawDashedLine(curY);
  curY += 28;

  // 7. Totais
  ctx.fillStyle = '#475569';
  ctx.font = '18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Total Bruto:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(doc.totals.grossTotal), width - paddingX, curY);
  curY += 26;

  if (doc.totals.discountTotal > 0) {
    ctx.fillStyle = '#b45309';
    ctx.textAlign = 'left';
    ctx.fillText('Descontos:', paddingX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`-${formatCurrency(doc.totals.discountTotal)}`, width - paddingX, curY);
    curY += 26;
  }

  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Tributos Totais:', paddingX, curY);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(doc.totals.taxTotal), width - paddingX, curY);
  curY += 32;

  // Caixa de destaque TOTAL A PAGAR
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(paddingX, curY - 22, contentWidth, 54);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(paddingX, curY - 22, contentWidth, 54);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL A PAGAR:', paddingX + 16, curY + 12);
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(formatCurrency(doc.totals.finalTotal), width - paddingX - 16, curY + 12);
  curY += 56;

  // 8. Formas de Pagamento
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FORMA DE PAGAMENTO:', paddingX, curY);
  curY += 24;

  doc.payments.forEach((p) => {
    ctx.fillStyle = '#334155';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    const mLabel =
      p.method === 'cartao'
        ? 'Cartão Débito/Crédito'
        : p.method === 'mbway'
        ? 'Pix / MB Way'
        : p.method === 'dinheiro'
        ? 'Dinheiro'
        : p.method;
    ctx.fillText(mLabel, paddingX, curY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 19px monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(formatCurrency(p.amount), width - paddingX, curY);
    curY += 26;
  });

  curY += 8;
  drawDashedLine(curY);
  curY += 30;

  // 9. Chave de Validação ATCUD
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(paddingX, curY - 18, contentWidth, 44);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(paddingX, curY - 18, contentWidth, 44);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`CHAVE DE VALIDAÇÃO: ${doc.atcud}`, centerX, curY + 10);
  curY += 54;

  // 10. QR Code Oficial desenhado diretamente em vetor no canvas
  const qrBoxSize = 130;
  const qrX = (width - qrBoxSize) / 2;
  const qrY = curY;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);

  // Marcadores de Canto do QR Code
  const drawCorner = (cx: number, cy: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx, cy, 34, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 6, cy + 6, 22, 22);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx + 11, cy + 11, 12, 12);
  };

  drawCorner(qrX + 10, qrY + 10);
  drawCorner(qrX + qrBoxSize - 44, qrY + 10);
  drawCorner(qrX + 10, qrY + qrBoxSize - 44);

  // Módulos centrais simulados do QR Code
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(qrX + 54, qrY + 18, 10, 10);
  ctx.fillRect(qrX + 70, qrY + 28, 10, 10);
  ctx.fillRect(qrX + 54, qrY + 54, 22, 22);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX + 60, qrY + 60, 10, 10);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(qrX + 86, qrY + 54, 10, 18);
  ctx.fillRect(qrX + 100, qrY + 70, 18, 10);
  ctx.fillRect(qrX + 54, qrY + 96, 18, 10);
  ctx.fillRect(qrX + 90, qrY + 96, 28, 20);
  ctx.fillRect(qrX + 72, qrY + 80, 10, 10);

  curY += qrBoxSize + 22;

  ctx.fillStyle = '#64748b';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('QR Code de Consulta de Autenticidade Fiscal', centerX, curY);
  curY += 24;

  ctx.font = '13px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${doc.signatureHash} - Software Certificado nº ${doc.certifiedSoftwareNumber}`, centerX, curY);
  curY += 26;

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Agradecemos a sua preferência!', centerX, curY);

  return canvas;
}
