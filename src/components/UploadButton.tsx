import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

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

        // Store in IndexedDB
        await db.receipts.add({
          storeName: "Unknown", // Will be updated after processing
          imageData: base64String,
          uploadDate: new Date(),
          processed: false
        });

        toast({
          title: "Receipt uploaded",
          description: "Your receipt has been saved locally",
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
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
        accept="image/*,.pdf"
        className="hidden"
      />
      <Button
        onClick={handleClick}
        disabled={isUploading}
        className="w-full bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity"
        size="lg"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload Receipt"}
      </Button>
    </>
  );
};