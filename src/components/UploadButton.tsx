import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { parseReweReceipt } from "@/lib/parsers/rewe-parser";
import { parseOliverFrankReceipt } from "@/lib/parsers/oliver-frank-parser";
import { parseAldiReceipt } from "@/lib/parsers/aldi-parser"; // Import Aldi parser
import { parseLidlReceipt } from '@/lib/parsers/lidl-parser';
import { defaultReceiptParser } from '@/lib/parsers/default-parser'; // Import default parser
import { ReceiptValidationError } from "@/lib/parsers/errors";
import Tesseract from 'tesseract.js';
import type { CategoryName } from "@/types/categories";
import { lmstudioService } from '@/lib/lmstudio-service';
import { syncManager } from '@/lib/sync-manager';
import { imageService } from '@/lib/image-service'; // Import image service

export const UploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);

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
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setStatusIndex(0);
      toast({
        title: "Processing receipt",
        description: scanStatuses[statusIndex],
      });

      // Create the receipt record first
      const receiptId = await db.receipts.add({
        storeName: "Processing...",
        storeAddress: "",
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

      // Process OCR directly from the file
      const result = await Tesseract.recognize(
        file,
        'deu', // German language
        {
          logger: m => console.log(m)
        }
      );

      console.log('Raw Extracted Text:', result.data.text);
      
      // Update the receipt with OCR text
      await db.receipts.update(receiptId, {
        text: result.data.text
      });

      // Process and store both thumbnail and full-size versions
      console.log('📸 Processing receipt images...');
      
      // Process thumbnail (small and low quality for icon)
      const thumbnailResult = await imageService.processImage(file, {
        maxWidth: 50,
        quality: 0.3
      });
      console.log('🔍 Thumbnail processed:', thumbnailResult.size, 'bytes');

      // Process fullsize (larger and higher quality for viewing)
      const fullsizeResult = await imageService.processImage(file, {
        maxWidth: 1200,
        quality: 0.8
      });
      console.log('✨ Fullsize processed:', fullsizeResult.size, 'bytes');

      // Store both versions in the database
      const imageId = await db.receiptImages.add({
        receiptId,
        thumbnail: thumbnailResult.blob,
        fullsize: fullsizeResult.blob,
        mimeType: 'image/jpeg',
        size: fullsizeResult.size,
        createdAt: new Date()
      });
      console.log('💾 Stored images with ID:', imageId);

      console.log('Lowercase Text:', result.data.text.toLowerCase());

      // Determine which parser to use based on the content
      const lowerCaseText = result.data.text.toLowerCase();
      console.log('Processed Text:', lowerCaseText); // Log the processed text for debugging

      // Split the text into lines for detailed logging
      const lines = result.data.text.split('\n');
      lines.forEach((line, index) => {
        console.log(`Line ${index + 1}: ${line}`); // Log each line for detailed inspection
      });

      const isAldi = lowerCaseText.includes('aldi');
      const isLidl = lowerCaseText.includes('lidl');
      const isOliverFrank = lowerCaseText.includes('oliver frank');
      const isRewe = /rewe/i.test(lowerCaseText); // Use regex for case-insensitive detection

      // Log the result of the Rewe check
      console.log('Is Rewe:', isRewe); // Log the result of the Rewe check

      // Parse the extracted text using the appropriate parser
      let parsedData;
      if (isAldi) {
        parsedData = await parseAldiReceipt(result.data.text, receiptId);
      } else if (isLidl) {
        parsedData = await parseLidlReceipt(result.data.text, receiptId);
      } else if (isOliverFrank) {
        parsedData = await parseOliverFrankReceipt(result.data.text, receiptId);
      } else if (isRewe) {
        parsedData = await parseReweReceipt(result.data.text, receiptId);
      } else {
        // Fallback to a default parser if no store is recognized
        parsedData = await defaultReceiptParser(result.data.text, receiptId);
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
              onClick={() => handleAiExtraction(result.data.text, receiptId)}
              disabled={isAiExtracting}
              className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            >
              {isAiExtracting ? 'Extracting...' : 'Try AI Extraction'}
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
      toast({
        title: "Upload Failed",
        description: "Failed to process the receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
