export class ReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptValidationError';
  }
}
