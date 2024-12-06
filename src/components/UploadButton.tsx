import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { parseReweReceipt } from "@/lib/parsers/rewe-parser";
import { parseOliverFrankReceipt } from "@/lib/parsers/oliver-frank-parser";
import { ReceiptValidationError } from "@/lib/parsers/errors";
import Tesseract from 'tesseract.js';
import type { CategoryName } from "@/types/categories";

export const UploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Store initial receipt in IndexedDB
        const receiptId = await db.receipts.add({
          storeName: "Processing...",
          storeAddress: "",
          imageData: base64String,
          uploadDate: new Date(),
          purchaseDate: new Date(),
          processed: false,
          totalAmount: 0,
          taxDetails: {
            taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
            taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
          }
        });

        toast({
          title: "Receipt uploaded",
          description: "Processing receipt data...",
        });

        try {
          // Use Tesseract.js to extract text from the image
          const result = await Tesseract.recognize(
            base64String,
            'deu', // German language
            {
              logger: m => console.log(m)
            }
          );

          // Log the raw extracted text
          console.log('Raw Extracted Text:', result.data.text);

          // Determine which parser to use based on the content
          const isOliverFrank = result.data.text.includes('Oliver Frank');
          
          // Parse the extracted text using the appropriate parser
          const parsedData = await (isOliverFrank 
            ? parseOliverFrankReceipt(result.data.text, receiptId)
            : parseReweReceipt(result.data.text, receiptId));

          // Create items array with all fields
          const items = await Promise.all(parsedData.items.map(async item => ({
            name: item.name,
            category: await db.determineCategory(item.name),
            price: item.totalPrice,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            taxRate: item.taxRate,
            receiptId: receiptId,
            date: parsedData.date
          })));

          // Update receipt with parsed data
          await db.receipts.update(receiptId, {
            storeName: parsedData.storeName,
            storeAddress: parsedData.storeAddress || "",
            purchaseDate: parsedData.date,
            processed: true,
            totalAmount: parsedData.totalAmount,
            taxDetails: {
              taxRateA: 'taxRateA' in parsedData.taxDetails ? parsedData.taxDetails.taxRateA : { rate: 0, net: 0, tax: 0, gross: 0 },
              taxRateB: 'taxRateB' in parsedData.taxDetails ? parsedData.taxDetails.taxRateB : { rate: 0, net: 0, tax: 0, gross: 0 },
            }
          });

          // Add all items to database
          await db.items.bulkAdd(items);

          toast({
            title: "Receipt processed",
            description: `Successfully processed ${items.length} items from ${parsedData.storeName}. Total: €${parsedData.totalAmount.toFixed(2)}`,
          });
        } catch (error) {
          console.error('Error processing receipt:', error);
          
          // Handle validation errors specifically
          if (error instanceof ReceiptValidationError) {
            toast({
              title: "Receipt processing failed",
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to process receipt. Please try again.",
              variant: "destructive",
            });
          }

          // Delete the failed receipt
          try {
            await db.deleteFailedScan(receiptId);
          } catch (deleteError) {
            console.error('Error deleting failed scan:', deleteError);
          }
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your receipt",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
        aria-label="Upload image"
      />
      <Button
        onClick={handleClick}
        disabled={isUploading}
        className="w-full bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity"
      >
        <Upload className="mr-2" /> Upload
      </Button>
    </div>
  );
};
