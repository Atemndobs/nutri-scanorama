import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const UploadButton = () => {
  return (
    <Button
      className="w-full bg-gradient-to-r from-nutri-purple to-nutri-pink text-white hover:opacity-90 transition-opacity"
      size="lg"
    >
      <Upload className="mr-2 h-4 w-4" />
      Upload Receipt
    </Button>
  );
};