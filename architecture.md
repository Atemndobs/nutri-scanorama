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

## AI Integration

### Overview
The AI integration has been fully implemented with the following features:
- Automatic item extraction from receipt text
- Smart retry system with up to 3 attempts
- Real-time progress tracking and user feedback
- Automatic category assignment
- Integration with sync queue and local database

### Ollama Service Implementation
- Processes raw receipt text to extract structured item data
- Handles validation and error cases
- Provides detailed feedback for debugging
- Supports both initial processing and manual retries

### User Interface Integration
- Progress indicators during extraction
- Clear success/error notifications
- Manual retry option with attempt tracking
- Real-time updates of extracted items

### Data Flow
- Receipt text → Ollama processing → Structured items
- Automatic category assignment
- Database updates and sync queue integration
- UI state management and updates

## Current Application Features

### Home Page
1. **Recent Scans**
   - Displays recently scanned receipts with detailed item information
   - Shows category icons and names for each item
   - Provides a clean, modern interface for viewing scanned items

2. **Top Categories**
   - Shows the most frequently occurring categories
   - Displays category icons with corresponding colors
   - Helps users track their shopping patterns

3. **Upload Functionality**
   - Allows users to scan and upload receipts
   - Processes receipts using OCR and AI extraction
   - Automatically categorizes items based on content

### Scanned Items Page
1. **All Items View**
   - Lists all scanned items chronologically
   - Displays item name, category (with icon), and price
   - Matches the home page styling for consistency
   - Provides a comprehensive view of all scanned items

### Data Management
1. **Local Database**
   - Uses Dexie.js for IndexedDB management
   - Stores items with categories and metadata
   - Enables offline functionality

2. **Category System**
   - Predefined categories with custom icons
   - Color-coded category indicators
   - Consistent category display across all views

### User Interface
1. **Navigation**
   - Bottom navigation bar for easy access
   - Intuitive icons for different sections
   - Responsive design for mobile use

2. **Styling**
   - Modern, clean interface
   - Consistent color scheme
   - Backdrop blur effects for visual appeal
   - Proper spacing and padding throughout

### AI Integration
1. **Receipt Processing**
   - OCR for text extraction
   - AI-powered item categorization
   - Smart total validation

2. **Data Extraction**
   - Intelligent item name parsing
   - Price extraction and validation
   - Category suggestion based on item content

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
