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

## AI Text Extraction and Processing

### Overview
The AI text extraction system uses a combination of OCR and LLM processing to accurately extract and categorize receipt data. The system is designed to handle various receipt formats while maintaining high accuracy and performance.

### Core Components

1. **OCR Processing**
   ```typescript
   interface OCRResult {
     text: string;
     confidence: number;
     blocks: Array<{
       text: string;
       bbox: BoundingBox;
       confidence: number;
     }>;
   }
   ```
   - Tesseract.js for text extraction
   - Block-level confidence scoring
   - Position information preservation
   - Multi-language support

2. **LLM Processing**
   ```typescript
   interface ProcessedReceipt {
     storeName: string;
     items: Array<{
       name: string;
       category: CategoryName;
       price: number;
       quantity?: number;
       unit?: string;
       pricePerUnit?: number;
       taxRate?: string;
     }>;
     metadata: {
       storeAddress?: string;
       date?: string;
       totalAmount: number;
       taxDetails?: {
         taxRateA: { rate: number, net: number, tax: number, gross: number };
         taxRateB?: { rate: number, net: number, tax: number, gross: number };
       };
     };
   }
   ```
   - Structured data extraction
   - Category assignment
   - Price and quantity parsing
   - Tax information extraction

3. **Model Selection**
   ```typescript
   type ModelType = 'fast' | 'precise';
   
   const MODELS = {
     fast: 'meta-llama-3.2-1b',
     precise: 'qwen2.5-coder-32b-instruct'
   };
   ```
   - Dual model approach
   - Performance vs accuracy tradeoff
   - Automatic fallback mechanisms

### Processing Pipeline

1. **Image Preprocessing**
   - Resolution optimization
   - Contrast enhancement
   - Noise reduction
   - Orientation correction

2. **Text Extraction**
   - OCR processing
   - Confidence filtering
   - Layout analysis
   - Text cleaning

3. **Data Structuring**
   - Store detection
   - Item parsing
   - Price extraction
   - Category assignment

### Design Decisions

1. **Dual Model Strategy**
   - **Decision**: Implement both fast and precise models
   - **Rationale**:
     - Balances speed and accuracy
     - Handles varying receipt complexity
     - Optimizes resource usage
     - Provides user choice

2. **Strict Category Enforcement**
   - **Decision**: Use predefined category set
   - **Rationale**:
     - Ensures data consistency
     - Improves categorization accuracy
     - Simplifies reporting
     - Better user experience

3. **Structured Response Format**
   - **Decision**: Enforce strict JSON schema
   - **Rationale**:
     - Reliable parsing
     - Type safety
     - Error prevention
     - Easy validation

4. **Progressive Processing**
   - **Decision**: Multi-stage extraction pipeline
   - **Rationale**:
     - Better error handling
     - Incremental feedback
     - Recovery options
     - Performance optimization

### Error Handling

1. **OCR Failures**
   - Confidence thresholds
   - Retry mechanisms
   - Alternative processing paths
   - User feedback

2. **LLM Processing**
   - Response validation
   - Fallback processing
   - Format correction
   - Error reporting

### Performance Optimization

1. **Processing Strategy**
   - Parallel processing where possible
   - Caching of intermediate results
   - Resource usage monitoring
   - Background processing

2. **Memory Management**
   - Efficient data structures
   - Stream processing
   - Resource cleanup
   - Memory limits

### Future Enhancements

1. **Model Improvements**
   - Custom model training
   - Receipt-specific fine-tuning
   - Multi-language support
   - Performance optimization

2. **Feature Additions**
   - Advanced tax handling
   - Currency conversion
   - Receipt comparison
   - Fraud detection

### Testing Strategy

1. **Unit Tests**
   - OCR accuracy
   - Parser reliability
   - Category assignment
   - Error handling

2. **Integration Tests**
   - End-to-end processing
   - Model switching
   - Error recovery
   - Performance metrics

### Security Considerations

1. **Data Protection**
   - Personal information handling
   - Data retention policies
   - Access controls
   - Encryption

2. **Model Security**
   - Input validation
   - Output sanitization
   - Resource limits
   - Version control

## Category Management System

### Overview
The category management system is designed to provide a flexible and maintainable way to categorize items from receipts, both automatically and manually. The system consists of several key components that work together to provide a seamless categorization experience.

### Core Components

1. **Category Data Structure**
   ```typescript
   type CategoryName = 
     | 'Fruits' | 'Vegetables' | 'Dairy' | 'Meat'
     | 'Bakery' | 'Beverages' | 'Snacks' | 'Cereals'
     | 'Other' | 'Sweets' | 'Oils';
   ```
   - Fixed set of categories to ensure consistency
   - Each category has an associated color for visual identification
   - 'Other' category serves as a fallback for uncategorized items

2. **Category Mapping System**
   - Maintains a database of keyword-to-category mappings
   - Supports both manual and AI-generated mappings
   - Uses case-insensitive matching for better accuracy
   - Mappings are stored in IndexedDB for offline access

3. **AI Integration**
   - Uses Ollama service for intelligent categorization
   - Strict prompt engineering to ensure category consistency
   - Fallback mechanisms for handling unknown items
   - Real-time processing with user feedback

### User Interface Design

1. **Category Manager Component**
   - Collapsible category sections for better organization
   - Preview mode showing limited items per category
   - "Show More" functionality for detailed viewing
   - Immediate feedback for all user actions
   - Integrated AI categorization for bulk processing

2. **Settings Integration**
   - Category management placed in Settings for easy access
   - Clear separation from storage management
   - Intuitive interface for adding/removing mappings
   - Visual feedback through toast notifications

### Data Flow

1. **Manual Categorization**
   ```
   User Input → Keyword/Category Selection → Database Update → UI Refresh
   ```

2. **AI Categorization**
   ```
   Text Input → Ollama Processing → Mapping Creation → Database Update → UI Refresh
   ```

3. **Category Mapping Usage**
   ```
   Receipt Upload → Item Extraction → Category Lookup → Default/AI Assignment
   ```

### Design Decisions

1. **Fixed Category Set**
   - **Decision**: Use a fixed set of categories rather than user-defined categories
   - **Rationale**: 
     - Ensures consistency across the application
     - Simplifies AI training and categorization
     - Prevents category proliferation
     - Makes statistics and visualization more meaningful

2. **Two-Tier Categorization**
   - **Decision**: Implement both manual and AI-powered categorization
   - **Rationale**:
     - Manual mappings provide precise control
     - AI categorization handles bulk processing
     - Hybrid approach maximizes accuracy and efficiency

3. **Collapsible UI**
   - **Decision**: Use collapsible sections with preview mode
   - **Rationale**:
     - Reduces visual clutter
     - Improves navigation in large datasets
     - Maintains access to full information when needed

4. **Local Storage**
   - **Decision**: Store category mappings in IndexedDB
   - **Rationale**:
     - Enables offline functionality
     - Provides fast access to mappings
     - Supports large numbers of mappings

### Future Considerations

1. **Performance Optimization**
   - Implement pagination for large mapping sets
   - Add caching for frequently used mappings
   - Optimize database queries for faster lookups

2. **Feature Enhancements**
   - Add bulk import/export of mappings
   - Implement mapping suggestions based on user patterns
   - Add category statistics and insights
   - Support for subcategories if needed

3. **AI Improvements**
   - Fine-tune AI categorization based on user corrections
   - Add confidence scores for AI categorizations
   - Implement batch processing for large datasets

### Validation and Testing

1. **Category Mapping Tests**
   - Verify case-insensitive matching
   - Test duplicate handling
   - Validate category constraints

2. **AI Integration Tests**
   - Test prompt effectiveness
   - Verify category consistency
   - Measure categorization accuracy

3. **UI Testing**
   - Verify responsive design
   - Test accessibility features
   - Validate user interaction flows

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
