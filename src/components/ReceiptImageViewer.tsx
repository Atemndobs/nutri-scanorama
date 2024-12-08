import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { imageService } from '@/lib/image-service';
import { Loader2 } from 'lucide-react';

interface ReceiptImageViewerProps {
  receiptId: number;
  open: boolean;
  onClose: () => void;
}

export const ReceiptImageViewer: React.FC<ReceiptImageViewerProps> = ({
  receiptId,
  open,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        const images = await imageService.getReceiptImage(receiptId);
        
        if (!images || !mounted) return;

        const url = imageService.createObjectURL(images.original);
        setImageUrl(url);
      } catch (err) {
        if (mounted) {
          setError('Failed to load receipt image');
          console.error('Failed to load receipt image:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (open && receiptId) {
      loadImage();
    }

    return () => {
      mounted = false;
      if (imageUrl) {
        imageService.revokeObjectURL(imageUrl);
      }
    };
  }, [receiptId, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receipt Image</DialogTitle>
        </DialogHeader>
        
        <div className="relative min-h-[400px] w-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500">
              {error}
            </div>
          )}
          
          {imageUrl && !loading && (
            <img
              src={imageUrl}
              alt="Receipt"
              className="w-full h-full object-contain"
              onError={() => setError('Failed to display image')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
