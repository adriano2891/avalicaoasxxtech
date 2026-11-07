/**
 * Validador oficial de NIF (Número de Identificação Fiscal) de Portugal
 * Conforme o algoritmo módulo 11 da Autoridade Tributária e Aduaneira (AT).
 */

export interface NifValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'singular' | 'coletiva' | 'consumidor_final' | 'administracao' | 'outro';
}

export function validatePortugueseNif(nif: string): NifValidationResult {
  if (!nif) {
    return { isValid: false, message: 'NIF não pode ser vazio' };
  }

  // Remove non-digit characters
  const cleanNif = nif.replace(/\D/g, '');

  if (cleanNif.length !== 9) {
    return { isValid: false, message: 'O NIF deve conter exatamente 9 dígitos' };
  }

  // Consumidor Final padrão
  if (cleanNif === '999999990') {
    return {
      isValid: true,
      message: 'Consumidor Final (sem identificação)',
      type: 'consumidor_final',
    };
  }

  const firstDigit = cleanNif[0];
  const validPrefixes = ['1', '2', '3', '5', '6', '8', '9'];

  if (!validPrefixes.includes(firstDigit)) {
    return { isValid: false, message: `Prefixo '${firstDigit}' inválido para NIF português` };
  }

  let type: 'singular' | 'coletiva' | 'consumidor_final' | 'administracao' | 'outro' = 'outro';
  if (['1', '2', '3'].includes(firstDigit)) {
    type = 'singular';
  } else if (firstDigit === '5') {
    type = 'coletiva';
  } else if (firstDigit === '6') {
    type = 'administracao';
  }

  // Algoritmo de validação do dígito de controlo (módulo 11)
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleanNif[i], 10) * (9 - i);
  }

  const remainder = sum % 11;
  const controlDigit = remainder < 2 ? 0 : 11 - remainder;

  const actualControlDigit = parseInt(cleanNif[8], 10);

  if (controlDigit !== actualControlDigit) {
    return { isValid: false, message: 'Dígito de controlo do NIF incorreto' };
  }

  return {
    isValid: true,
    message: 'NIF válido',
    type,
  };
}
