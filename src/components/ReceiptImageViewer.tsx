import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { imageService } from '@/lib/image-service';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/db';

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
        console.log('🔍 Loading full-size image for receipt:', receiptId);

        const imageEntry = await db.receiptImages
          .where('receiptId')
          .equals(receiptId)
          .first();
        
        console.log('📦 Found image entry:', imageEntry);
        
        if (!imageEntry || !mounted) {
          console.error('❌ No image entry found for receipt:', receiptId);
          setError('Image not found');
          return;
        }

        // Try fullsize first, then image (for backward compatibility)
        const imageBlob = imageEntry.fullsize || imageEntry.image;
        if (!imageBlob) {
          console.error('❌ No image blob found in entry');
          setError('Image data is missing');
          return;
        }

        const url = imageService.createObjectURL(imageBlob);
        console.log('✨ Created full-size image URL:', url);
        setImageUrl(url);
      } catch (err) {
        console.error('❌ Failed to load receipt image:', err);
        if (mounted) {
          setError('Failed to load receipt image');
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
        console.log('🧹 Cleaning up image URL:', imageUrl);
        imageService.revokeObjectURL(imageUrl);
      }
    };
  }, [receiptId, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Receipt Image</DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full bg-white rounded-lg overflow-hidden" style={{ maxHeight: '85vh' }}>
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
              style={{ maxHeight: '80vh' }}
              onError={(e) => {
                console.error('❌ Image failed to load:', e);
                setError('Failed to display image');
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
