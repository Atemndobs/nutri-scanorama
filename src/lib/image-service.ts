import { db } from './db';

interface ImageProcessingOptions {
  maxWidth?: number;
  quality?: number;
}

interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  size: number;
}

export class ImageService {
  private static instance: ImageService;

  private constructor() {}

  static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  async processImage(file: File, options: ImageProcessingOptions = {}): Promise<ProcessedImage> {
    const { maxWidth = 2048, quality = 0.8 } = options;
    
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
    
    // Convert to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob as Blob),
        'image/jpeg',
        quality
      );
    });

    return {
      blob,
      width,
      height,
      size: blob.size
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async createThumbnail(file: File): Promise<ProcessedImage> {
    return this.processImage(file, {
      maxWidth: 300,
      quality: 0.6
    });
  }

  async storeReceiptImage(receiptId: number, file: File): Promise<number> {
    try {
      // Process images
      const [original, thumbnail] = await Promise.all([
        this.processImage(file),
        this.createThumbnail(file)
      ]);

      // Store in database
      const imageId = await db.receiptImages.add({
        receiptId,
        originalImage: original.blob,
        thumbnailImage: thumbnail.blob,
        mimeType: file.type,
        size: original.size,
        createdAt: new Date()
      });

      return imageId;
    } catch (error) {
      console.error('Failed to store receipt image:', error);
      throw new Error('Failed to store receipt image');
    }
  }

  async getReceiptImage(receiptId: number): Promise<{
    original: Blob;
    thumbnail: Blob;
  } | null> {
    const image = await db.receiptImages
      .where('receiptId')
      .equals(receiptId)
      .first();

    if (!image) return null;

    return {
      original: image.originalImage,
      thumbnail: image.thumbnailImage
    };
  }

  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const imageService = ImageService.getInstance();
