import { jsPDF } from 'jspdf';
import { FiscalDocument, CompanyInfo } from '../types';
import { formatCurrency, formatDateTime, getDocumentTypeLabel } from './formatters';

export function generateFiscalDocumentPdf(doc: FiscalDocument, company: CompanyInfo): jsPDF {
  const mmWidth = 80;

  // Calcula a altura dinâmica com base na quantidade de itens e linhas
  const headerHeight = 52;
  const docInfoHeight = 26;
  const customerHeight = 22;
  const itemsHeight = 14 + doc.items.length * 9;
  const taxHeight = 16 + (doc.totals.ivaBreakdown?.length || 1) * 6;
  const totalsHeight = 28;
  const paymentsHeight = 14 + doc.payments.length * 6;
  const qrAndFooterHeight = 65;

  const totalHeight = Math.max(
    200,
    headerHeight + docInfoHeight + customerHeight + itemsHeight + taxHeight + totalsHeight + paymentsHeight + qrAndFooterHeight
  );

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [mmWidth, totalHeight],
  });

  const leftMargin = 4;
  const rightMargin = 76;
  const centerX = 40;
  let curY = 8;

  const drawSeparator = (y: number, dashed = true) => {
    if (dashed) {
      pdf.setLineDashPattern([1, 1], 0);
      pdf.setDrawColor(180, 180, 180);
    } else {
      pdf.setLineDashPattern([], 0);
      pdf.setDrawColor(100, 100, 100);
    }
    pdf.setLineWidth(0.2);
    pdf.line(leftMargin, y, rightMargin, y);
    pdf.setLineDashPattern([], 0);
  };

  // 1. Cabeçalho da Empresa
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(20, 20, 20);
  pdf.text((company.name || 'ASSX Tech PDV').toUpperCase(), centerX, curY, { align: 'center' });
  curY += 4.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text(company.legalName || 'ASSX Tech PDV Comércio e Serviços Digitais Ltda.', centerX, curY, { align: 'center' });
  curY += 3.8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`CNPJ/CPF: ${company.nif}`, centerX, curY, { align: 'center' });
  curY += 3.8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 80);
  if (company.address) {
    pdf.text(company.address, centerX, curY, { align: 'center' });
    curY += 3.5;
  }
  if (company.city || company.postalCode) {
    pdf.text(`CEP ${company.postalCode || ''} - ${company.city || ''}`, centerX, curY, { align: 'center' });
    curY += 3.5;
  }
  if (company.phone) {
    pdf.text(`Tel: ${company.phone}`, centerX, curY, { align: 'center' });
    curY += 3.5;
  }

  curY += 1.5;
  drawSeparator(curY);
  curY += 4;

  // 2ª Via / Status
  if (doc.isSecondCopy || doc.printCount > 1) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 80, 0);
    pdf.text('2ª VIA / CÓPIA DE CONSULTA', centerX, curY, { align: 'center' });
    curY += 4;
  }

  // 2. Dados do Documento Fiscal
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(10, 10, 10);
  pdf.text(getDocumentTypeLabel(doc.documentType).toUpperCase(), leftMargin, curY);
  pdf.text(doc.documentNumber, rightMargin, curY, { align: 'right' });
  curY += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text('Data/Hora:', leftMargin, curY);
  pdf.text(formatDateTime(doc.issuedAt), rightMargin, curY, { align: 'right' });
  curY += 3.6;

  pdf.text('Operador:', leftMargin, curY);
  pdf.text(doc.operatorName || 'Operador', rightMargin, curY, { align: 'right' });
  curY += 3.6;

  curY += 1;
  drawSeparator(curY);
  curY += 4;

  // 3. Dados do Cliente
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text('Cliente:', leftMargin, curY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(20, 20, 20);
  const safeCustName = doc.customerName.length > 25 ? doc.customerName.slice(0, 24) + '…' : doc.customerName;
  pdf.text(safeCustName, rightMargin, curY, { align: 'right' });
  curY += 3.6;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(70, 70, 70);
  pdf.text('CPF/CNPJ:', leftMargin, curY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(20, 20, 20);
  pdf.text(doc.customerNif, rightMargin, curY, { align: 'right' });
  curY += 3.6;

  if (doc.customerPhone) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(70, 70, 70);
    pdf.text('Telefone/WhatsApp:', leftMargin, curY);
    pdf.text(doc.customerPhone, rightMargin, curY, { align: 'right' });
    curY += 3.6;
  }

  curY += 1;
  drawSeparator(curY);
  curY += 4;

  // 4. Cabeçalho de Itens
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('DESCRIÇÃO', leftMargin, curY);
  pdf.text('QTD', 46, curY, { align: 'center' });
  pdf.text('TRIB', 57, curY, { align: 'right' });
  pdf.text('TOTAL', rightMargin, curY, { align: 'right' });
  curY += 3.2;

  drawSeparator(curY, false);
  curY += 3.5;

  // Lista de Itens
  doc.items.forEach((item) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(20, 20, 20);

    const splitName = pdf.splitTextToSize(item.productName, 38);
    pdf.text(splitName[0], leftMargin, curY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(String(item.quantity), 46, curY, { align: 'center' });
    pdf.text(`${item.ivaRate}%`, 57, curY, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(item.total), rightMargin, curY, { align: 'right' });

    if (splitName.length > 1) {
      curY += 3.2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text(splitName[1], leftMargin, curY);
    }
    curY += 4.2;
  });

  drawSeparator(curY);
  curY += 4;

  // 5. Detalhamento Tributário
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(70, 70, 70);
  pdf.text('Detalhamento Tributário:', leftMargin, curY);
  curY += 3.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110, 110, 110);
  pdf.text('Alíquota', leftMargin, curY);
  pdf.text('Base Calc.', 36, curY, { align: 'right' });
  pdf.text('Imposto', 56, curY, { align: 'right' });
  pdf.text('Total', rightMargin, curY, { align: 'right' });
  curY += 3.2;

  if (doc.totals.ivaBreakdown && doc.totals.ivaBreakdown.length > 0) {
    doc.totals.ivaBreakdown.forEach((tax) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`${tax.rate}% (${tax.code})`, leftMargin, curY);
      pdf.text(formatCurrency(tax.base), 36, curY, { align: 'right' });
      pdf.text(formatCurrency(tax.amount), 56, curY, { align: 'right' });
      pdf.text(formatCurrency(tax.base + tax.amount), rightMargin, curY, { align: 'right' });
      curY += 3.2;
    });
  }

  drawSeparator(curY);
  curY += 4;

  // 6. Totais
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text('Total Bruto:', leftMargin, curY);
  pdf.text(formatCurrency(doc.totals.grossTotal), rightMargin, curY, { align: 'right' });
  curY += 3.5;

  if (doc.totals.discountTotal > 0) {
    pdf.text('Descontos:', leftMargin, curY);
    pdf.text(`-${formatCurrency(doc.totals.discountTotal)}`, rightMargin, curY, { align: 'right' });
    curY += 3.5;
  }

  pdf.text('Tributos Totais:', leftMargin, curY);
  pdf.text(formatCurrency(doc.totals.taxTotal), rightMargin, curY, { align: 'right' });
  curY += 4;

  // Caixa de Destaque para TOTAL A PAGAR
  pdf.setFillColor(245, 245, 245);
  pdf.rect(leftMargin, curY - 0.5, rightMargin - leftMargin, 7.5, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(leftMargin, curY - 0.5, rightMargin - leftMargin, 7.5, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(10, 10, 10);
  pdf.text('TOTAL A PAGAR:', leftMargin + 2, curY + 4.5);
  pdf.text(formatCurrency(doc.totals.finalTotal), rightMargin - 2, curY + 4.5, { align: 'right' });
  curY += 11;

  // 7. Pagamento
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('FORMA DE PAGAMENTO:', leftMargin, curY);
  curY += 3.5;

  doc.payments.forEach((p) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 40, 40);
    const mLabel =
      p.method === 'cartao'
        ? 'Cartão Débito/Crédito'
        : p.method === 'mbway'
        ? 'Pix / MB Way'
        : p.method === 'dinheiro'
        ? 'Dinheiro'
        : p.method;
    pdf.text(mLabel, leftMargin, curY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(p.amount), rightMargin, curY, { align: 'right' });
    curY += 3.5;
  });

  drawSeparator(curY);
  curY += 4;

  // 8. Chave de Validação ATCUD
  pdf.setFillColor(240, 240, 240);
  pdf.rect(leftMargin, curY, rightMargin - leftMargin, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 15, 15);
  pdf.text(`CHAVE DE VALIDAÇÃO: ${doc.atcud}`, centerX, curY + 4, { align: 'center' });
  curY += 9;

  // 9. Desenho Simulado de QR Code Fiscal (Quadrados posicionados no centro)
  const qrSize = 22;
  const qrLeft = (mmWidth - qrSize) / 2;
  pdf.setDrawColor(30, 30, 30);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrLeft, curY, qrSize, qrSize, 'FD');

  // Marcadores de canto do QR Code
  pdf.setFillColor(20, 20, 20);
  pdf.rect(qrLeft + 1.5, curY + 1.5, 6, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrLeft + 2.5, curY + 2.5, 4, 4, 'F');
  pdf.setFillColor(20, 20, 20);
  pdf.rect(qrLeft + 3.2, curY + 3.2, 2.6, 2.6, 'F');

  pdf.rect(qrLeft + qrSize - 7.5, curY + 1.5, 6, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrLeft + qrSize - 6.5, curY + 2.5, 4, 4, 'F');
  pdf.setFillColor(20, 20, 20);
  pdf.rect(qrLeft + qrSize - 5.8, curY + 3.2, 2.6, 2.6, 'F');

  pdf.rect(qrLeft + 1.5, curY + qrSize - 7.5, 6, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrLeft + 2.5, curY + qrSize - 6.5, 4, 4, 'F');
  pdf.setFillColor(20, 20, 20);
  pdf.rect(qrLeft + 3.2, curY + qrSize - 5.8, 2.6, 2.6, 'F');

  // Padrões centrais simulados
  pdf.rect(qrLeft + 9.5, curY + 9.5, 3.5, 3.5, 'F');
  pdf.rect(qrLeft + 14, curY + 10, 2, 4, 'F');
  pdf.rect(qrLeft + 10, curY + 14, 4, 2, 'F');
  pdf.rect(qrLeft + 8.5, curY + 3, 2, 2, 'F');
  pdf.rect(qrLeft + 12, curY + 4, 2, 2, 'F');
  pdf.rect(qrLeft + 4, curY + 9, 2, 2, 'F');

  curY += qrSize + 3;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(110, 110, 110);
  pdf.text('QR Code de Consulta de Autenticidade Fiscal', centerX, curY, { align: 'center' });
  curY += 3.5;

  pdf.text(`${doc.signatureHash} - Software Certificado nº ${doc.certifiedSoftwareNumber}`, centerX, curY, { align: 'center' });
  curY += 3.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(40, 40, 40);
  pdf.text('Agradecemos a sua preferência!', centerX, curY, { align: 'center' });

  return pdf;
}
