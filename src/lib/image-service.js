import { db } from './db';
export class ImageService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ImageService.instance) {
            ImageService.instance = new ImageService();
        }
        return ImageService.instance;
    }
    async processImage(file, options = {}) {
        const { maxWidth = 800, quality = 0.5 } = options; // Reduced quality and max width for viewing
        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        // Load image
        const image = await this.loadImage(file);
        // Calculate dimensions
        let width = image.width;
        let height = image.height;
        // Scale down if needed
        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        // Draw and compress image
        ctx.drawImage(image, 0, 0, width, height);
        // Convert to blob with higher compression
        const blob = await new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        });
        return {
            blob,
            width,
            height,
            size: blob.size
        };
    }
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
    async storeReceiptImage(receiptId, file, options = { maxWidth: 50, quality: 0.3 }) {
        try {
            // Process image with viewing-optimized settings
            const thumbnailResult = await this.processImage(file, { maxWidth: 50, quality: 0.3 });
            const fullsizeResult = await this.processImage(file, { maxWidth: 1200, quality: 0.8 });
            // Store in database
            const imageId = await db.receiptImages.add({
                receiptId,
                thumbnail: thumbnailResult.blob,
                fullsize: fullsizeResult.blob,
                mimeType: 'image/jpeg',
                size: fullsizeResult.size,
                createdAt: new Date()
            });
            return imageId;
        }
        catch (error) {
            console.error('Failed to store receipt image:', error);
            throw new Error('Failed to store receipt image');
        }
    }
    async getReceiptImage(receiptId) {
        const image = await db.receiptImages
            .where('receiptId')
            .equals(receiptId)
            .first();
        return image ? image.fullsize : null;
    }
    createObjectURL(blob) {
        return URL.createObjectURL(blob);
    }
    revokeObjectURL(url) {
        URL.revokeObjectURL(url);
    }
}
export const imageService = ImageService.getInstance();
//# sourceMappingURL=image-service.js.map