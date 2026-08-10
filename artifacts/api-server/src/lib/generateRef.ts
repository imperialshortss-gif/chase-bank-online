export function generateTransactionRef(): string {
  const prefix = "CHB";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateAccountNumber(): string {
  const digits = Math.floor(Math.random() * 9000000000) + 1000000000;
  return digits.toString();
}
