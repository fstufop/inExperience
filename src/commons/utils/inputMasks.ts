/**
 * Aplica máscara de tempo MM:SS ou M:SS
 * @param value - Valor a ser mascarado
 * @returns Valor mascarado no formato MM:SS ou M:SS
 * 
 * Exemplos:
 * - 3 dígitos (324) -> 3:24
 * - 4 dígitos (1123) -> 11:23
 */
export const applyTimeMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 4 dígitos (MMSS)
  const limited = numbers.slice(0, 4);
  
  // Se tiver 1 ou 2 dígitos, retorna como está
  if (limited.length <= 2) {
    return limited;
  }
  
  // Se tiver 3 dígitos, formata como M:SS (ex: 324 -> 3:24)
  if (limited.length === 3) {
    return `${limited.slice(0, 1)}:${limited.slice(1, 3)}`;
  }
  
  // Se tiver 4 dígitos, formata como MM:SS (ex: 1123 -> 11:23)
  return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`;
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

