interface ReweReceiptItem {
  name: string;
  quantity?: number;
  pricePerUnit?: number;
  totalPrice: number;
  taxRate: "A" | "B"; // In Germany, A = 19%, B = 7%
}

interface ParsedReweReceipt {
  storeName: string;
  storeAddress: string;
  date: Date;
  items: ReweReceiptItem[];
  totalAmount: number;
  taxDetails: {
    taxRateA: { rate: number; net: number; tax: number; gross: number; };
    taxRateB: { rate: number; net: number; tax: number; gross: number; };
  };
}

export const parseReweReceipt = (text: string): ParsedReweReceipt => {
  // Split text into lines and remove empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize receipt data
  const receipt: ParsedReweReceipt = {
    storeName: 'REWE',
    storeAddress: '',
    date: new Date(),
    items: [],
    totalAmount: 0,
    taxDetails: {
      taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
      taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
    }
  };

  // Parse store address (usually first two lines)
  if (lines.length >= 2) {
    receipt.storeAddress = `${lines[0].trim()} ${lines[1].trim()}`.replace(/\s+/g, ' ');
  }

  // Parse items
  let currentLine = 0;
  while (currentLine < lines.length) {
    const line = lines[currentLine];

    // Skip header lines until we find items
    if (line.includes('EUR')) {
      // Parse item lines
      const itemMatch = line.match(/^(.+?)\s+([\d,]+)\s*([AB])\s*$/);
      if (itemMatch) {
        const [, name, priceStr, taxRate] = itemMatch;
        
        // Parse quantity if available (e.g., "0.486 kg x 3,98 EUR/kg")
        const quantityMatch = name.match(/(\d+,\d+)\s*kg\s*x\s*(\d+,\d+)\s*EUR\/kg/);
        
        const item: ReweReceiptItem = {
          name: quantityMatch ? name.split(' x ')[0] : name.trim(),
          totalPrice: parseFloat(priceStr.replace(',', '.')),
          taxRate: taxRate as "A" | "B"
        };

        if (quantityMatch) {
          item.quantity = parseFloat(quantityMatch[1].replace(',', '.'));
          item.pricePerUnit = parseFloat(quantityMatch[2].replace(',', '.'));
        }

        receipt.items.push(item);
      }
    }

    // Parse total amount
    if (line.includes('SUMME')) {
      const totalMatch = line.match(/(\d+,\d+)/);
      if (totalMatch) {
        receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      }
    }

    // Parse tax details
    if (line.includes('A= 19,0%')) {
      const taxLine = lines[currentLine];
      const values = taxLine.match(/(\d+,\d+)/g);
      if (values && values.length >= 2) {
        receipt.taxDetails.taxRateA = {
          rate: 19,
          net: parseFloat(values[0].replace(',', '.')),
          tax: parseFloat(values[1].replace(',', '.')),
          gross: parseFloat(values[2].replace(',', '.'))
        };
      }
    }

    if (line.includes('B= 7,0%')) {
      const taxLine = lines[currentLine];
      const values = taxLine.match(/(\d+,\d+)/g);
      if (values && values.length >= 2) {
        receipt.taxDetails.taxRateB = {
          rate: 7,
          net: parseFloat(values[0].replace(',', '.')),
          tax: parseFloat(values[1].replace(',', '.')),
          gross: parseFloat(values[2].replace(',', '.'))
        };
      }
    }

    currentLine++;
  }

  return receipt;
};