import type { CategoryName } from '@/types/categories';

export interface ParsedItem {
    name: string;
    quantity?: number;
    pricePerUnit?: number;
    totalPrice: number;
    taxRate: string;
    category: CategoryName;
}

export interface ParsedReceipt {
    storeName: string;
    storeAddress: string;
    date: Date;
    totalAmount: number;
    items: ParsedItem[];
    taxDetails: {
        taxRateA: { rate: number; net: number; tax: number; gross: number };
        taxRateB: { rate: number; net: number; tax: number; gross: number };
    };
    discrepancyDetected: boolean;
}

