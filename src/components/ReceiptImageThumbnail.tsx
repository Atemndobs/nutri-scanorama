import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { imageService } from '@/lib/image-service';
import { Loader2 } from 'lucide-react';

interface ReceiptImageThumbnailProps {
  receiptId: number;
  onClick?: (e: React.MouseEvent) => void;
}

export const ReceiptImageThumbnail: React.FC<ReceiptImageThumbnailProps> = ({
  receiptId,
  onClick
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading thumbnail for receipt:', receiptId);

        const imageEntry = await db.receiptImages
          .where('receiptId')
          .equals(receiptId)
          .first();
        
        if (!imageEntry || !mounted) {
          console.log('❌ No image entry found for receipt:', receiptId);
          return;
        }

        // Try thumbnail first, then image (for backward compatibility)
        const imageBlob = imageEntry.thumbnail || imageEntry.image;
        if (!imageBlob) {
          console.log('❌ No thumbnail blob found in entry');
          return;
        }

        const url = imageService.createObjectURL(imageBlob);
        console.log('✨ Created thumbnail URL:', url);
        if (mounted) {
          setImageUrl(url);
        }
      } catch (err) {
        console.error('❌ Failed to load thumbnail:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
      if (imageUrl) {
        console.log('🧹 Cleaning up thumbnail URL:', imageUrl);
        imageService.revokeObjectURL(imageUrl);
      }
    };
  }, [receiptId]);

  if (loading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt="Receipt thumbnail"
      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    />
  );
};
