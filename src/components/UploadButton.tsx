import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader, Info } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseReweReceipt } from "@/lib/parsers/rewe-parser";
import { parseAldiReceipt } from "@/lib/parsers/aldi-parser"; // Import Aldi parser
import { parseLidlReceipt } from '@/lib/parsers/lidl-parser';
import { parseNahkaufReceipt } from '@/lib/parsers/nahkauf-parser'; // Import Nahkauf parser
import { defaultReceiptParser } from '@/lib/parsers/default-parser'; // Import default parser
import { ReceiptValidationError } from "@/lib/parsers/errors";
import Tesseract from 'tesseract.js';
import type { CategoryName } from "@/types/categories";
import { lmstudioService } from '@/lib/lmstudio-service';
import { syncManager } from '@/lib/sync-manager';
import { imageService } from '@/lib/image-service'; // Import image service

export const UploadButton = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scanStatuses = [
    "Warming up scanner... ",
    "Focusing lens... ",
    "Detecting edges... ",
    "Enhancing clarity... ",
    "Optimizing contrast... ",
    "Reading barcodes... ",
    "Almost ready... ",
    "Processing image... ",
    "Looking sharp... ",
    "Final touches... "
  ];

  const uploadStatuses = [
    "Starting AI... ",
    "Reading text... ",
    "Finding items... ",
    "Calculating prices... ",
    "Checking totals... ",
    "Organizing data... ",
    "Saving details... ",
    "Double checking... ",
    "Nearly there... ",
    "All done! "
  ];

  useEffect(() => {
    let interval: number | undefined;
    if (isUploading) {
      interval = window.setInterval(() => {
        setStatusIndex((current) => (current + 1) % scanStatuses.length);
      }, 1000);
    } else {
      setStatusIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    setIsUploading(true);
    let extractedText = '';
    let receiptId: number | undefined;
    
    try {
      const file = event.target.files[0];
      
      // Process and store receipt images
      console.log('📸 Processing receipt images...');
      const thumbnailResult = await imageService.processImage(file, { maxWidth: 50, quality: 0.3 });
      console.log('🔍 Thumbnail processed:', thumbnailResult.size, 'bytes');
      
      const fullsizeResult = await imageService.processImage(file, { maxWidth: 1200, quality: 0.8 });
      console.log('✨ Fullsize processed:', fullsizeResult.size, 'bytes');

      // Create receipt entry
      receiptId = await db.receipts.add({
        storeName: 'Processing...',
        storeAddress: '',
        uploadDate: new Date(),
        purchaseDate: new Date(),
        processed: false,
        totalAmount: 0,
        text: "",
        taxDetails: {
          taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
          taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
        }
      });

      // Store images
      const imageId = await db.receiptImages.add({
        receiptId,
        thumbnail: thumbnailResult.blob,
        fullsize: fullsizeResult.blob,
        mimeType: 'image/jpeg',
        size: fullsizeResult.size,
        createdAt: new Date()
      });
      console.log('💾 Stored images with ID:', imageId);

      // Perform OCR
      const result = await Tesseract.recognize(
        file,
        'deu', // German language
        {
          logger: m => console.log(m)
        }
      );
      extractedText = result.data.text;
      
      console.log('Raw Extracted Text:', result.data.text);
      console.log('Lowercase Text:', extractedText.toLowerCase());
      console.log('Processed Text:', extractedText);
      
      // Log each line for debugging
      extractedText.split('\n').forEach((line, index) => {
        console.log(`Line ${index + 1}: ${line}`);
      });

      // Update the receipt with OCR text
      await db.receipts.update(receiptId, {
        text: extractedText
      });

      // Check for known stores
      const lowerCaseText = extractedText.toLowerCase();
      const isAldi = lowerCaseText.includes('aldi');
      const isLidl = lowerCaseText.includes('lidl');
      const isNahkauf = lowerCaseText.includes('nahkauf');
      const isRewe = /rewe/i.test(lowerCaseText);

      // Log the result of the Rewe check
      console.log('Is Rewe:', isRewe); // Log the result of the Rewe check

      // Parse the extracted text using the appropriate parser
      let parsedData;
      if (isAldi) {
        parsedData = await parseAldiReceipt(extractedText, receiptId);
      } else if (isLidl) {
        parsedData = await parseLidlReceipt(extractedText, receiptId);
      } else if (isNahkauf) {
        parsedData = await parseNahkaufReceipt(extractedText, receiptId);
      } else if (isRewe) {
        parsedData = await parseReweReceipt(extractedText, receiptId);
      } else {
        // Fallback to a default parser if no store is recognized
        parsedData = await defaultReceiptParser(extractedText, receiptId);
      }

      // Check and handle the store name
      if (parsedData.storeName === 'Other') {
        parsedData.storeName = prompt('Store not recognized. Please enter the store name:') || 'Unknown Store';
      }

      // Create items array with all fields
      const items = await Promise.all(parsedData.items.map(async item => ({
        name: item.name,
        category: await db.determineCategory(item.name),
        price: item.totalPrice,
        totalPrice: item.totalPrice,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        taxRate: 0, // Default value for taxRate
        receiptId: receiptId,
        date: parsedData.date,
      })));

      // Calculate total from items
      const calculatedTotal = items.reduce((sum, item) => sum + item.price, 0);
      console.debug('[DISCREPANCY_CHECK] Checking totals', {
        parsedTotal: parsedData.totalAmount,
        calculatedTotal,
        difference: Math.abs(parsedData.totalAmount - calculatedTotal)
      });

      // Set discrepancy flag if totals don't match
      const discrepancyDetected = Math.abs(parsedData.totalAmount - calculatedTotal) > 0.01;
      console.debug('[DISCREPANCY_CHECK] Setting discrepancy flag', {
        discrepancyDetected,
        receipt: receiptId,
        storeName: parsedData.storeName
      });

      // Prepare receipt update data
      const receiptUpdate = {
        storeName: parsedData.storeName,
        storeAddress: parsedData.storeAddress || "",
        purchaseDate: parsedData.date,
        processed: true,
        totalAmount: parsedData.totalAmount,
        discrepancyDetected,
        taxDetails: {
          taxRateA: 'taxRateA' in parsedData.taxDetails ? parsedData.taxDetails.taxRateA : { rate: 0, net: 0, tax: 0, gross: 0 },
          taxRateB: 'taxRateB' in parsedData.taxDetails ? parsedData.taxDetails.taxRateB : { rate: 0, net: 0, tax: 0, gross: 0 },
        }
      };

      // Queue receipt update in sync manager
      await syncManager.queueChanges([{
        type: 'update',
        table: 'receipts',
        data: {
          id: receiptId,
          ...receiptUpdate
        },
        timestamp: Date.now()
      }]);

      // Add items to sync queue
      await syncManager.queueChanges([{
        type: 'create',
        table: 'receiptItems',
        data: items,
        timestamp: Date.now()
      }]);

      if (parsedData.discrepancyDetected) {
        setHasDiscrepancy(true);
        toast({
          title: "Warning",
          description: <div>
            <p>Some items could not be extracted from the receipt.</p>
            <button
              onClick={() => handleAiExtraction(extractedText, receiptId)}
              disabled={isAiExtracting}
              className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            >
              {isAiExtracting ? 'Extracting...' : 'Try AI'}
            </button>
          </div>,
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({
          title: "Receipt processed",
          description: `Successfully processed ${items.length} items from ${parsedData.storeName}. Total: €${parsedData.totalAmount.toFixed(2)}`,
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      let displayErrorMessage: React.ReactNode = "Failed to process the receipt. Please try again.";
      
      // Clean up the failed receipt
      if (typeof receiptId === 'number') {
        try {
          await db.receipts.delete(receiptId);
          await db.receiptImages.where('receiptId').equals(receiptId).delete();
          console.log('Cleaned up failed receipt:', receiptId);
        } catch (cleanupError) {
          console.error('Failed to clean up receipt:', cleanupError);
        }
      }
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('No valid items')) {
          // Check if it's actually a store recognition issue
          const lowerCaseText = extractedText.toLowerCase();
          const hasKnownStore = ['rewe', 'lidl', 'aldi', 'nahkauf'].some(store => 
            lowerCaseText.includes(store)
          );
          
          if (!hasKnownStore) {
            const storeInfoContent = (
              <div className="space-y-2">
                <p className="font-medium">Why is this important?</p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>The store name helps us accurately process your items</li>
                  <li>Make sure the store name at the top of the receipt is included in your scan</li>
                  <li>Avoid cropping out the header of the receipt</li>
                  <li>Currently supported stores: REWE, Lidl, Aldi, Nahkauf</li>
                </ul>
              </div>
            );

            displayErrorMessage = isMobile ? (
              <div className="space-y-2">
                <p>Store name not found in receipt.</p>
                {storeInfoContent}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Store name not found in receipt.</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-4 text-left">
                      {storeInfoContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          } else {
            displayErrorMessage = "Could not detect items on the receipt. Please make sure the receipt is clear and properly scanned.";
          }
        }
      }

      toast({
        title: "Upload Failed",
        description: displayErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsAiExtracting(false);
      setStatusIndex(0);
      setHasDiscrepancy(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleAiExtraction = async (receiptText: string, receiptId: number) => {
    try {
      setIsAiExtracting(true);
      
      // Call lmstudio service to process the receipt
      const processedReceipt = await lmstudioService.processReceipt(receiptText);
      console.log('Processed Receipt:', processedReceipt);

      if (!processedReceipt.items.length) {
        throw new Error('No items processed from receipt');
      }

      // Process each extracted item
      const processedItems = await Promise.all(processedReceipt.items.map(async (item) => {
        const category = await db.determineCategory(item.name);
        return {
          ...item,
          category,
          receiptId,
          timestamp: Date.now(),
          price: item.price || 0, // Use totalPrice instead of pricePerUnit
          date: new Date(Date.now()), // Convert timestamp to Date object
          taxRate: item.taxRate || '0.1', // Add taxRate property
        };
      }));

      // Add items to sync queue
      await syncManager.queueChanges([{
        type: 'create',
        table: 'receiptItems',
        data: processedItems,
        timestamp: Date.now()
      }]);

      toast({
        title: "Success",
        description: `Successfully extracted ${processedItems.length} additional items using AI`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('AI extraction failed:', error);
      toast({
        title: "Error",
        description: "Failed to extract items using AI",
        variant: "destructive",
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleScan = () => {
    cameraInputRef.current?.click();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
        aria-label="Upload image"
        disabled={isUploading}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Take photo"
        disabled={isUploading}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleScan}
          disabled={isUploading}
          className="bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity h-auto min-h-[2.5rem] w-full"
        >
          {isUploading ? (
            <div className="flex items-center justify-center w-full">
              <Camera className="mr-2 h-4 w-4 flex-shrink-0 animate-[spin_3s_linear_infinite]" />
              <span className="text-xs truncate animate-pulse">{scanStatuses[statusIndex]}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Camera className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Scan</span>
            </div>
          )}
        </Button>
        <Button
          onClick={handleClick}
          disabled={isUploading}
          className="bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity h-auto min-h-[2.5rem] w-full"
        >
          {isUploading ? (
            <div className="flex items-center justify-center w-full">
              <Upload className="mr-2 h-4 w-4 flex-shrink-0 animate-[spin_3s_linear_infinite]" />
              <span className="text-xs truncate animate-pulse">{uploadStatuses[statusIndex]}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Upload</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};
