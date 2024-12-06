import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { parseReweReceipt } from "@/lib/parsers/rewe-parser";
import { parseOliverFrankReceipt } from "@/lib/parsers/oliver-frank-parser";
import Tesseract from 'tesseract.js';

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
          imageData: base64String,
          uploadDate: new Date(),
          processed: false
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
            ? parseOliverFrankReceipt(result.data.text)
            : parseReweReceipt(result.data.text));

          const currentDate = new Date();
          
          // Create items array
          const items = await Promise.all(parsedData.items.map(async item => ({
            name: item.name,
            category: await db.determineCategory(item.name),
            price: item.totalPrice,
            receiptId: receiptId,
            date: currentDate
          })));

          // Update category counts
          const categoryUpdates = items.reduce((acc: Record<CategoryName, number>, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          }, {} as Record<CategoryName, number>);

          // Save items and update category counts in a transaction
          await db.transaction('rw', [db.items, db.categories], async () => {
            // Save items to items table
            await db.items.bulkAdd(items);

            // Update category counts
            await Promise.all(
              Object.entries(categoryUpdates).map(([category, count]) =>
                db.categories
                  .where('name')
                  .equals(category)
                  .modify(cat => {
                    cat.itemCount = (cat.itemCount || 0) + count;
                  })
              )
            );
          });

          // Update receipt with processed data
          await db.receipts.update(receiptId, {
            storeName: parsedData.storeName,
            totalAmount: parsedData.totalAmount,
            processed: true
          });

          toast({
            title: "Receipt processed",
            description: "Receipt data has been extracted successfully",
          });
        } catch (error) {
          console.error('Error processing receipt:', error);
          toast({
            title: "Processing failed",
            description: "Failed to extract receipt data. Please try again.",
            variant: "destructive",
          });
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
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <Button
        onClick={handleClick}
        disabled={isUploading}
        className="w-full bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity"
        size="lg"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Processing..." : "Upload Receipt"}
      </Button>
    </>
  );
};