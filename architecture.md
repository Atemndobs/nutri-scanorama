# Architecture Document for Supermarket Receipt Parsers and Nutri-Scanorama v2

## Overview
This document outlines the strategy for implementing parsers for various German supermarkets in the receipt processing application. The goal is to extend the current functionality to support multiple supermarket receipt formats, ensuring accurate data extraction and processing.

## List of Major German Supermarkets
1. **REWE**
2. **Aldi (Aldi Nord and Aldi Süd)**
3. **Lidl**
4. **Edeka**
5. **Penny**
6. **Netto**
7. **Kaufland**
8. **Real**
9. **dm (Drogerie Markt)**
10. **Rossmann**

## Strategy for Implementing Supermarket Parsers

1. **Define Parser Requirements**
   - Each parser should extract relevant data: store name, address, purchase date, item details (name, quantity, price), total amount, and tax details.
   - Analyze sample receipts to identify patterns and common elements for each supermarket.

2. **Create a Generic Parser Interface**
   - Define a common interface or base class for all parsers to ensure consistency and easier management.
   - Example interface:
     ```typescript
     interface SupermarketParser {
       parseReceipt(text: string, receiptId: number): Promise<ParsedReceipt>;
     }
     ```

3. **Implement Individual Parsers**
   - Implement a dedicated parser for each supermarket that adheres to the defined interface, handling the specific receipt format.
   - Example functions: `parseAldiReceipt`, `parseLidlReceipt`, etc.

4. **Modify the Existing Codebase**
   - Update the upload and parsing logic to accommodate the new parsers. Modify the `handleFileUpload` function to check for keywords or patterns that identify the supermarket and call the appropriate parser.
   - Example modification:
     ```javascript
     const isAldi = result.data.text.includes('Aldi');
     const isLidl = result.data.text.includes('Lidl');
     const parsedData = await (isAldi 
       ? parseAldiReceipt(result.data.text, receiptId)
       : isLidl 
       ? parseLidlReceipt(result.data.text, receiptId)
       : parseReweReceipt(result.data.text, receiptId));
     ```

## Receipt Processing Architecture

### Store Name Handling
- The logic for determining the store name based on parsed receipt data will be handled in the `UploadButton` component after the parsing step.
- If the store name is identified as 'Other', the user will be prompted to enter the correct store name.
- This change ensures that the parsers remain focused solely on parsing tasks without incorporating business logic related to store identification.

### Default Receipt Parser Implementation
- **Purpose**: Created a default receipt parser to handle unknown receipts. This parser prompts the user for missing information, such as the store name and address, if items are found in the receipt.
- **Error Handling**: If no items are found, the parser throws a `ReceiptValidationError` indicating that no valid items were detected.
- **Integration**: The default parser is invoked when no recognized store is identified during the parsing process, ensuring that user input is captured for completeness.

## AI Extraction Integration

### Overview
- Introduced a feature that allows users to trigger AI-based extraction of items from receipts when discrepancies are detected between the total item price and the extracted total.

### User Interface
- A UI indication will inform users of the discrepancy and provide a button to trigger the AI extraction.

### Ollama Service
- The Ollama service will be utilized to extract items from the receipt text when triggered by the user.
- The extracted items will be processed and returned to the application for further handling.

### Synchronization with Database
- New items extracted via AI will be added as `SyncQueueItem` entries for synchronization with the database.
- The `SyncManager` will manage these new entries, ensuring they are queued and processed correctly.

## Recent Decisions and Updates

### Receipt Parsing Logic Enhancements
1. **Case-Insensitive String Comparisons**: Implemented case-insensitive checks for store names and other string comparisons to improve parsing accuracy.

2. **Partial Success Logic**: Added a mechanism to handle partial success in receipt parsing. If the sum of extracted item prices differs from the total amount, a warning message is logged to inform the user to review the items for completeness.

3. **Item Extraction Improvements**: Enhanced the item extraction logic to better capture item names and prices from various receipt formats. This includes refining regex patterns and handling different formats in the raw text.

4. **Logging Enhancements**: Added structured logging for extracted details, including store name, total amount, store address, and items. Each log entry is tagged with `[ALDI_RECEIPT]` for easier filtering.

5. **Invalid Item Handling**: Updated the validation logic to allow for partial successes. Invalid items are logged without failing the entire receipt processing, enabling users to see which items may need correction.

### Future Considerations
- **Further Refinement of Regex Patterns**: Continue to refine regex patterns used for item extraction to accommodate more variations in receipt formats.
- **User Interface Updates**: Consider adding UI elements to allow users to manually edit or confirm extracted items when discrepancies are detected.

## Testing and Validation
   - Create unit tests for each parser to ensure they handle various receipt formats and edge cases correctly.
   - Validate output against known correct data to ensure accuracy.

## Documentation and Maintenance
   - Document each parser's functionality, including specific patterns or rules used for extraction.
   - Keep parsers updated as supermarkets may change their receipt formats over time.

## Conclusion
By following this strategy, we can systematically implement parsers for all major German supermarkets, enhancing the application's ability to accurately process diverse receipt formats. These updates aim to enhance the robustness and usability of the receipt parsing functionality within Nutri-Scanorama v2, ensuring a better user experience and more accurate data extraction.
