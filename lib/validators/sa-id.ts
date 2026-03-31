export interface SAIDValidationResult {
  isValid: boolean;
  message?: string;
  gender?: 'Male' | 'Female';
  citizen?: boolean;
}

export function validateSAID(idNumber: string): SAIDValidationResult {
  // 1. Check length and numeric
  if (!/^\d{13}$/.test(idNumber)) {
    return { isValid: false, message: 'ID number must be exactly 13 digits.' };
  }

  const monthStr = idNumber.substring(2, 4);
  const dayStr = idNumber.substring(4, 6);

  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, message: 'Invalid month in ID number.' };
  }
  if (day < 1 || day > 31) {
    return { isValid: false, message: 'Invalid day in ID number.' };
  }

  // 3. Extract Gender & Citizenship
  const genderCode = parseInt(idNumber.substring(6, 10), 10);
  const gender = genderCode < 5000 ? 'Female' : 'Male';
  const citizenCode = parseInt(idNumber.substring(10, 11), 10);
  const citizen = citizenCode === 0;

  // 4. Luhn Checksum Algorithm
  let sum = 0;
  let shouldDouble = false;

  for (let i = idNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(idNumber.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const isLuhnValid = (sum % 10 === 0);

  if (!isLuhnValid) {
    return { isValid: false, message: 'Invalid ID number (checksum mismatch).' };
  }

  return {
    isValid: true,
    gender,
    citizen,
  };
}
