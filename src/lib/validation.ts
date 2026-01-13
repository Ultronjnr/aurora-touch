export interface AmountValidation {
  isValid: boolean;
  error?: string;
  value?: number;
}

export function validateAmount(
  input: string | number,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}
): AmountValidation {
  const { min = 0.01, max = 1000000, allowZero = false } = options;
  
  // Convert to string for parsing
  const strInput = String(input).trim();
  
  // Check for empty input
  if (!strInput || strInput === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  // Parse to number
  const parsed = parseFloat(strInput);
  
  // Check for NaN
  if (isNaN(parsed)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  // Check for Infinity
  if (!isFinite(parsed)) {
    return { isValid: false, error: 'Amount is too large' };
  }
  
  // Check for negative
  if (parsed < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }
  
  // Check for zero
  if (!allowZero && parsed === 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }
  
  // Check minimum
  if (parsed < min) {
    return { isValid: false, error: `Amount must be at least R${min.toFixed(2)}` };
  }
  
  // Check maximum
  if (parsed > max) {
    return { isValid: false, error: `Amount cannot exceed R${max.toFixed(2)}` };
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(parsed * 100) / 100;
  
  return { isValid: true, value: rounded };
}

export function validateInteger(
  input: string | number,
  options: {
    min?: number;
    max?: number;
  } = {}
): AmountValidation {
  const { min = 0, max = 365 } = options;
  
  const strInput = String(input).trim();
  
  if (!strInput || strInput === '') {
    return { isValid: false, error: 'Value is required' };
  }
  
  const parsed = parseInt(strInput, 10);
  
  if (isNaN(parsed)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (parsed < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (parsed > max) {
    return { isValid: false, error: `Value cannot exceed ${max}` };
  }
  
  return { isValid: true, value: parsed };
}
