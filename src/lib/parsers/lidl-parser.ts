import { ParsedReceipt } from '@/types/receipt-types';
import { ReceiptValidationError } from './errors';

export async function parseLidlReceipt(text: string, receiptId: number): Promise<ParsedReceipt> {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    const receipt: ParsedReceipt = {
        storeName: 'Lidl',
        storeAddress: '',
        date: null,
        totalAmount: 0,
        items: [],
        taxDetails: {
            taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
            taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
        }
    };

    let parsingItems = false;
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('Summe')) {
            parsingItems = true;
            continue;
        }

        if (parsingItems) {
            const itemMatch = trimmedLine.match(/^(.*?)\s+(\d+[,.]\d+) EUR/);
            if (itemMatch) {
                const [_, name, priceStr] = itemMatch;
                const price = parseFloat(priceStr.replace(',', '.'));
                receipt.items.push({ name: name.trim(), totalPrice: price });
            }
        }

        if (trimmedLine.includes('Datum')) {
            const dateMatch = trimmedLine.match(/(\d{2}\.\d{2}\.\d{4})/);
            if (dateMatch) {
                receipt.date = new Date(dateMatch[1].replace('.', '-').split('-').reverse().join('-'));
            }
        }

        if (trimmedLine.includes('Betrag')) {
            const totalMatch = trimmedLine.match(/(\d+[.,]\d+)/);
            if (totalMatch) {
                receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
            }
        }

        if (trimmedLine.includes('MwSt')) {
            const taxMatch = trimmedLine.match(/(\d+)%\s+(\d+[.,]\d+) EUR/);
            if (taxMatch) {
                const rate = parseInt(taxMatch[1]);
                const taxAmount = parseFloat(taxMatch[2].replace(',', '.'));
                if (rate === 19) {
                    receipt.taxDetails.taxRateA.tax = taxAmount;
                    receipt.taxDetails.taxRateA.net = receipt.totalAmount - taxAmount;
                    receipt.taxDetails.taxRateA.gross = receipt.totalAmount;
                } else if (rate === 7) {
                    receipt.taxDetails.taxRateB.tax = taxAmount;
                    receipt.taxDetails.taxRateB.net = receipt.totalAmount - taxAmount;
                    receipt.taxDetails.taxRateB.gross = receipt.totalAmount;
                }
            }
        }
    }

    if (receipt.items.length === 0) {
        throw new ReceiptValidationError('No valid items found in Lidl receipt.');
    }

    return receipt;
}
