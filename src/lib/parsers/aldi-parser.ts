import { ParsedReceipt } from '@/types/receipt-types';
import { ReceiptValidationError } from './errors';

export async function parseAldiReceipt(text: string, receiptId: number): Promise<ParsedReceipt> {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    const receipt: ParsedReceipt = {
        storeName: '', // Set dynamically based on receipt
        storeAddress: '', // Initialize store address
        date: null, // Extract from receipt
        totalAmount: 0,
        items: [],
        taxDetails: { // Initialize tax details
            taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
            taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
        }
    };

    // Determine store name based on receipt content
    if (text.toLowerCase().includes('aldi süd'.toLowerCase())) {
        receipt.storeName = 'ALDI Süd';
    } else if (text.toLowerCase().includes('aldi nord'.toLowerCase())) {
        receipt.storeName = 'ALDI Nord';
    } else {
        receipt.storeName = 'Unknown Store';
        console.warn('Unknown store detected.');
        const storeName = prompt('Store not recognized. Please enter the store name:') || 'Unknown Store';
        receipt.storeName = storeName;
    }

    // Continue with item extraction logic regardless of store detection
    let parsingItems = false;
    for (const line of lines) {
        const trimmedLine = line.trim();

        // Start parsing items after the "Summe" line
        if (trimmedLine.toLowerCase().includes('summe'.toLowerCase())) {
            parsingItems = true;
            continue;
        }

        if (parsingItems) {
            // Match item pattern: name followed by price
            const itemMatch = trimmedLine.match(/^(.*?)\s+(\d+[,.]?)\d*\s*EUR/);
            if (itemMatch) {
                const [_, name, priceStr] = itemMatch;
                const price = parseFloat(priceStr.replace(',', '.'));
                receipt.items.push({ name: name.trim(), totalPrice: price });
            }
        }

        // Extract date
        if (trimmedLine.toLowerCase().includes('datum'.toLowerCase())) {
            const dateMatch = trimmedLine.match(/(\d{2}\.\d{2}\.\d{4})/);
            if (dateMatch) {
                receipt.date = new Date(dateMatch[1].replace('.', '-').split('-').reverse().join('-'));
            }
        }

        // Extract total amount
        if (trimmedLine.toLowerCase().includes('betrag'.toLowerCase())) {
            const totalMatch = trimmedLine.match(/(\d+[.,]\d+)/);
            if (totalMatch) {
                receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
            }
        }

        // Extract tax details
        if (trimmedLine.toLowerCase().includes('mwst'.toLowerCase())) {
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

        // Extract store address
        if (trimmedLine.toLowerCase().includes('straße') || trimmedLine.toLowerCase().includes('str.')) {
            receipt.storeAddress = trimmedLine; // Store the address
        }
    }

    // Log the details
    console.log('[ALDI_RECEIPT] Store Name:', receipt.storeName);
    console.log('[ALDI_RECEIPT] Total Amount:', receipt.totalAmount);
    console.log('[ALDI_RECEIPT] Store Address:', receipt.storeAddress);
    console.log('[ALDI_RECEIPT] Items:', receipt.items.length > 0 ? receipt.items : '[]'); // Log items or empty array

    // Validate receipt data
    if (receipt.items.length === 0) {
        console.warn('No valid items found in receipt.');
    }

    // Log any invalid items
    const invalidItems = receipt.items.filter(item => !item.name || !item.totalPrice);
    if (invalidItems.length > 0) {
        console.warn('Invalid items found:', invalidItems);
    }

    // Proceed with processing valid items
    const validItems = receipt.items.filter(item => item.name && item.totalPrice);

    // Calculate the sum of extracted prices
    const sumOfPrices = validItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Compare with the total amount
    if (sumOfPrices !== receipt.totalAmount) {
        console.warn('Partial success: The sum of extracted prices differs from the total amount. Please review the extracted items for completeness.');
    }

    return receipt;
}
