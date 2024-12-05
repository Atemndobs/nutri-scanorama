import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { parseReweReceipt } from "@/lib/parsers/rewe-parser";
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

          // Parse the extracted text using our custom REWE parser
          const parsedData = parseReweReceipt(result.data.text);
          const currentDate = new Date();
          
          // Update receipt with processed data
          await db.receipts.update(receiptId, {
            storeName: parsedData.storeName,
            items: parsedData.items.map(item => ({
              name: item.name,
              category: item.taxRate === 'B' ? 'Food' : 'Other',
              price: item.totalPrice,
              receiptId: receiptId,
              date: currentDate
            })),
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