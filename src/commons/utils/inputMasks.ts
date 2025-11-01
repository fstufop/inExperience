/**
 * Aplica máscara de tempo MM:SS
 * @param value - Valor a ser mascarado
 * @returns Valor mascarado no formato MM:SS
 */
export const applyTimeMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 4 dígitos (MMSS)
  const limited = numbers.slice(0, 4);
  
  // Aplica formato MM:SS
  if (limited.length <= 2) {
    return limited;
  } else {
    return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`;
  }
};

/**
 * Aplica máscara de peso (apenas números)
 * @param value - Valor a ser mascarado
 * @returns Valor com apenas números
 */
export const applyWeightMask = (value: string): string => {
  // Remove tudo que não é número
  return value.replace(/\D/g, '');
};

/**
 * Aplica máscara de repetições (apenas números inteiros)
 * @param value - Valor a ser mascarado
 * @returns Valor com apenas números inteiros
 */
export const applyRepsMask = (value: string): string => {
  // Remove tudo que não é número
  return value.replace(/\D/g, '');
};

/**
 * Valida formato de tempo MM:SS
 * @param value - Valor a ser validado
 * @returns true se válido, false caso contrário
 */
export const validateTimeFormat = (value: string): boolean => {
  const timeRegex = /^([0-5]?[0-9]):([0-5][0-9])$/;
  return timeRegex.test(value);
};

/**
 * Remove máscara de tempo, retornando apenas números
 * @param value - Valor mascarado
 * @returns Apenas números
 */
export const removeTimeMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

