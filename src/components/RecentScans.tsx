import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt as ReceiptIcon, ShoppingBag, Wand2, Calendar, ShoppingCart, List, AlertTriangle, CheckCircle, Loader, Brain, Zap, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge"; // Badge import
import { categoryIcons } from "@/components/categories/categoryIcons";
import { CategoryName, defaultCategories } from "@/types/categories";
import { Receipt, ReceiptItem } from "@/lib/db";
import { capitalizeFirstLetter } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CategoryManager } from "@/components/CategoryManager"; // Import CategoryManager
import { lmstudioService } from "@/lib/lmstudio-service"; // Import LMStudio service
import { syncManager } from "@/lib/sync-manager"; // Import Sync manager
import { aiProviderManager } from '@/lib/ai-provider-manager';
import { getStoreLogo } from '@/lib/store-logos';
import { imageService } from '@/lib/image-service'; // Import image service
import { ReceiptImageThumbnail } from './ReceiptImageThumbnail'; // Import ReceiptImageThumbnail
import { ReceiptImageViewer } from './ReceiptImageViewer'; // Import ReceiptImageViewer

interface RecentScansProps {
  className?: string;
}

export const RecentScans: React.FC<RecentScansProps> = ({ className }) => {
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false); // Add state for CategoryManager visibility
  const [selectedItem, setSelectedItem] = useState<ReceiptItem | null>(null); // Add state for selected item
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [processingReceiptId, setProcessingReceiptId] = useState<number | null>(null);
  const [extractionAttempts, setExtractionAttempts] = useState<Record<string, number>>({});
  const [modelType, setModelType] = useState<'fast' | 'precise'>('fast');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const loadReceiptWithItems = async (receipt: Receipt) => {
    console.debug('[RecentScans] Processing receipt:', receipt);
    console.debug('[RecentScans] Receipt ID:', receipt.id);
    if (!receipt.processed) {
      console.debug('[RecentScans] Receipt not processed, returning early');
      return receipt;
    }

    try {
      // Load receipt image
      if (receipt.id) {
        const image = await imageService.getReceiptImage(receipt.id);
        if (image) {
          const imageUrl = imageService.createObjectURL(image);
          receipt.imageUrl = imageUrl;
        }
      }

      console.debug('[RecentScans] Querying items for receipt ID:', receipt.id);
      const items = await db.items
        .where('receiptId')
        .equals(receipt.id!)
        .toArray();

      console.debug(`[RecentScans] Loaded ${items.length} items for receipt ${receipt.id}`);
      console.debug('[RecentScans] Items:', items);

      if (items.length === 0) {
        console.warn('[RecentScans] No items found for processed receipt:', receipt.id);
        // Double check if items exist directly
        const allItems = await db.items.toArray();
        console.debug('[RecentScans] All items in database:', allItems);
      }

      const result = {
        ...receipt,
        items: items.map(item => ({
          ...item,
          taxRate: '0.1', // Convert taxRate to string format
        }))
      };
      console.debug('[RecentScans] Returning receipt with items:', result);
      return result;
    } catch (error) {
      console.error('[RecentScans] Error loading items:', error);
      return receipt;
    }
  };

  const receipts = useLiveQuery(async () => {
    console.debug('[RecentScans] Loading recent receipts...');
    const recentReceipts = await db.receipts
      .orderBy('uploadDate')
      .reverse()
      .limit(3)
      .toArray();

    // Get total count of receipts
    const totalCount = await db.receipts.count();

    console.debug('[RecentScans] Raw receipts from DB:', recentReceipts.map(r => ({
      id: r.id,
      storeName: r.storeName,
      processed: r.processed,
      discrepancyDetected: r.discrepancyDetected
    })));

    // Load items and categories for each receipt
    console.debug('[RecentScans] Loading items for receipts...');
    const receiptsWithItems = await Promise.all(
      recentReceipts.map(loadReceiptWithItems)
    );

    console.debug('[RecentScans] Processed receipts:', receiptsWithItems.map(r => ({
      id: r.id,
      storeName: r.storeName,
      processed: r.processed,
      discrepancyDetected: r.discrepancyDetected,
      itemsCount: r.items?.length
    })));

    console.debug('[RecentScans] Found recent receipts:', receiptsWithItems);

    // Load items and categories for each receipt
    console.debug('[RecentScans] Loading items for receipts...');
    const receiptsWithItemsAndCategories = await Promise.all(
      receiptsWithItems.map(async (receipt) => {
        const items = await db.items
          .where('receiptId')
          .equals(receipt.id!)
          .toArray();

        return {
          ...receipt,
          items: items.map(item => ({
            ...item,
            taxRate: '0.1', // Convert taxRate to string format
          }))
        };
      })
    );

    console.debug('[RecentScans] Finished loading all receipts with items');
    return { receipts: receiptsWithItemsAndCategories, totalCount };
  });

  const totalScannedItems = useLiveQuery(async () => {
    return await db.items.count();
  });

  const handleReceiptClick = async (receipt: Receipt) => {
    console.debug('[RecentScans] Receipt clicked:', receipt);
    const receiptWithItems = await loadReceiptWithItems(receipt);
    console.debug('[RecentScans] Loaded receipt with items for dialog:', receiptWithItems);
    console.debug('[RecentScans] Receipt items:', receiptWithItems.items);
    setSelectedReceipt(receiptWithItems);
  };

  const handleViewItems = (receiptId: number) => {
    navigate(`/items/${receiptId}`);
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    try {
      await db.deleteReceipt(receiptId);
      setSelectedReceipt(null);
      toast({
        title: "Receipt deleted",
        description: "Receipt and its items have been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({
        title: "Error",
        description: "Failed to delete receipt.",
        variant: "destructive",
      });
    }
  };

  const handleManageCategory = (item: ReceiptItem) => {
    setSelectedItem(item);
    // setCategoryManagerOpen(true);
  };

  const handleModelTypeChange = (type: 'fast' | 'precise') => {
    setModelType(type);
    aiProviderManager.setModelType(type);
    console.log('[RecentScans] Model type changed to:', type);
  };

  const handleAiExtraction = async (receipt: Receipt) => {
    if (!receipt.id) return;
    try {
      setIsAiExtracting(true);

      // Track attempts for this receipt
      const currentAttempts = (extractionAttempts[receipt.id] || 0) + 1;
      setExtractionAttempts(prev => ({ ...prev, [receipt.id]: currentAttempts }));

      console.log('[RecentScans] Starting AI extraction for receipt:', receipt.id);
      console.log('[RecentScans] Receipt data:', receipt);

      if (!receipt.text) {
        console.error('[RecentScans] Receipt text is empty');
        throw new Error('Receipt text is empty');
      }

      console.log('[RecentScans] Using receipt text:', receipt.text);

      // Use aiProviderManager instead of direct lmstudioService call
      aiProviderManager.setModelType(modelType);
      const processedReceipt = await aiProviderManager.processReceipt(receipt.text);
      console.debug('[RecentScans] AI Processed Receipt:', processedReceipt);

      if (!processedReceipt?.items || processedReceipt.items.length === 0) {
        if (currentAttempts >= 3) {
          toast({
            title: 'Extraction failed',
            description: 'Unable to extract items after multiple attempts. Please try a different receipt or contact support.',
            duration: 7000
          });
          // Reset attempts for this receipt
          setExtractionAttempts(prev => ({ ...prev, [receipt.id]: 0 }));
        } else {
          toast({
            title: 'No items found',
            description: `Please try scanning the receipt again (Attempt ${currentAttempts}/3)`,
            duration: 5000
          });
        }
        return;
      }

      // Success - reset attempts and process items
      setExtractionAttempts(prev => ({ ...prev, [receipt.id]: 0 }));

      // First, delete existing items for this receipt
      await db.items.where('receiptId').equals(receipt.id!).delete();
      console.log('[RecentScans] Cleared existing items for receipt:', receipt.id);

      // Process each extracted item
      const processedItems = await Promise.all(processedReceipt.items.map(async (item) => {
        const category = await db.determineCategory(item.name);
        return {
          name: item.name,
          category,
          receiptId: receipt.id!,
          price: item.price || 0,
          pricePerUnit: item.price,
          taxRate: item.taxRate || '0.1',
          date: receipt.purchaseDate,
        };
      }));

      // Add items to sync queue
      await syncManager.queueChanges([{
        type: 'create',
        table: 'receiptItems',
        data: processedItems,
        timestamp: Date.now()
      }]);

      toast({
        title: "Success",
        description: `Successfully extracted ${processedItems.length} additional items using AI`,
        variant: "default",
      });

      // Refresh the receipt data
      const updatedReceipt = await loadReceiptWithItems(receipt);
      setSelectedReceipt(updatedReceipt);

    } catch (error) {
      console.error('[RecentScans] AI extraction failed:', error);

      // Show appropriate error message based on the error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      toast({
        title: 'AI Extraction Failed',
        description: errorMessage.includes('All AI providers failed')
          ? 'All available AI services failed to process the receipt. Please try again later.'
          : 'Failed to extract items from receipt. Please try again.',
        variant: "destructive",
        duration: 5000
      });

      // Increment attempt counter
      const newAttempts = (currentAttempts || 0) + 1;
      setExtractionAttempts(prev => ({ ...prev, [receipt.id]: newAttempts }));

      if (newAttempts >= 3) {
        // Reset attempts after 3 failures
        setExtractionAttempts(prev => ({ ...prev, [receipt.id]: 0 }));
        toast({
          title: 'Maximum Attempts Reached',
          description: 'Unable to process receipt after multiple attempts. Please try again later or contact support.',
          variant: "destructive",
          duration: 7000
        });
      }
    } finally {
      setIsAiExtracting(false);
      setProcessingReceiptId(null);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageViewerOpen(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {receipts?.receipts.length > 0 && (
        <>
          <div className="flex justify-center items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Recent Scans</h2>
              <Link to="/scans" className="hover:opacity-80 transition-opacity">
                <Badge variant="secondary" className="ml-2">{receipts.totalCount}</Badge>
              </Link>
            </div>
            <Link to="/scans" className="text-nutri-purple hover:underline ml-2 flex items-center">
              <span className="text-lg">&gt;</span>
            </Link>
          </div>
          {receipts?.receipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer"
              onClick={() => handleReceiptClick(receipt)}
            >
              <CardContent className="flex items-center p-2">
                <div className="h-8 w-8 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-3">
                  {/* <ReceiptIcon className="h-4 w-4 text-nutri-purple" /> */}
                  {receipt.storeName ? (
                    getStoreLogo(receipt.storeName) ? (
                      <img
                        src={getStoreLogo(receipt.storeName)}
                        alt={receipt.storeName}
                        className="h-6 w-6 object-contain"
                      />
                    ) : (
                      <ReceiptIcon className="h-4 w-4 text-nutri-purple" />
                    )
                  ) : (
                    <ReceiptIcon className="h-4 w-4 text-nutri-purple" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <h3 className="font-medium flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-nutri-pink" />
                    {receipt.storeName}
                    {receipt.processed && receipt.discrepancyDetected && (
                      <>
                        {/* <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          Items Missing
                        </Badge> */}
                        <div className="flex gap-2 items-center">
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            disabled={isAiExtracting}
                            onClick={() => {
                              const newType = modelType === 'fast' ? 'precise' : 'fast';
                              setModelType(newType);
                              lmstudioService.setModel(newType);
                              toast({
                                title: `Switched to ${newType} model`,
                                description: newType === 'fast' 
                                  ? "Using faster but less accurate model" 
                                  : "Using slower but more accurate model",
                                duration: 3000,
                                className: newType === 'fast' 
                                  ? "bg-yellow-500/10 border-yellow-500/20" 
                                  : "bg-blue-500/10 border-blue-500/20",
                              });
                            }}
                          >
                            {modelType === 'fast' ? (
                              <Zap className="h-3 w-3 text-yellow-500" />
                            ) : (
                              <Brain className="h-3 w-3 text-blue-500" />
                            )}
                          </Button> */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProcessingReceiptId(receipt.id);
                              handleAiExtraction(receipt);
                            }}
                            disabled={isAiExtracting || processingReceiptId === receipt.id}
                          >
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 flex items-center gap-1">
                              {processingReceiptId === receipt.id ? (
                                <Loader className="h-3 w-3 animate-spin text-purple-500" />
                              ) : (
                                <Wand2 className="h-3 w-3 text-purple-500" />
                              )}
                              <span>{processingReceiptId === receipt.id ? 'Processing...' : 'Try AI'}</span>
                            </Badge>
                          </Button>
                          {/* Add receipt thumbnail */}
                          {receipt.id && (
                            <div className="flex items-center">
                              <div 
                                className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
                                onClick={handleImageClick}
                              >
                                <ReceiptImageThumbnail
                                  receiptId={receipt.id}
                                  onClick={handleImageClick}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground inline" />
                      <p>{new Date(receipt.uploadDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}</p>
                    </div>
                    {receipt.processed && receipt.items && (
                      <p className="flex items-center">
                        <ShoppingCart className="w-3 h-3 text-muted-foreground ml-1 inline" />
                        {receipt.items.length}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {receipt.processed ? (
                      <>
                        {receipt.discrepancyDetected && !isAiExtracting ? (
                          <>
                            Missing Items
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          </>
                        ) : isAiExtracting && processingReceiptId === receipt.id ? (
                          <>
                            Processing...
                            <Loader className="h-3 w-3 text-yellow-500 animate-spin" />
                          </>
                        ) : (
                          <>
                            Processed
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Processing...
                        <Loader className="h-3 w-3 text-yellow-500 animate-spin" />
                      </>
                    )}
                  </p>
                  {receipt.processed && receipt.totalAmount && (
                    <p className="font-medium">€{receipt.totalAmount.toFixed(2)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => {
        console.debug('[RecentScans] Dialog open state changed:', open);
        console.debug('[RecentScans] Current selectedReceipt:', selectedReceipt);
        if (!open) setSelectedReceipt(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Receipt Details</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 text-blue-500 mr-1 inline" />
                      {new Date(selectedReceipt?.uploadDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </Badge>
                    {selectedReceipt?.discrepancyDetected && (
                      <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                        Items Missing
                      </Badge>
                    )}
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isAiExtracting}
                        onClick={() => {
                          const newType = modelType === 'fast' ? 'precise' : 'fast';
                          handleModelTypeChange(newType);
                          toast({
                            title: `Switched to ${newType} model`,
                            description: newType === 'fast'
                              ? "Faster model but less accurate"
                              : "More accurate model, but might take longer",
                            duration: 3000,
                            className: newType === 'fast'
                              ? "bg-yellow-500/10 border-yellow-500/20"
                              : "bg-blue-500/10 border-blue-500/20",
                          });
                        }}
                      >
                        {modelType === 'fast' ? (
                          <Zap className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <Brain className="h-3 w-3 text-blue-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => selectedReceipt && handleAiExtraction(selectedReceipt)}
                        disabled={isAiExtracting}
                      >
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 flex items-center gap-1">
                          {isAiExtracting ? (
                            <Loader className="h-3 w-3 animate-spin text-purple-500" />
                          ) : (
                            <Wand2 className="h-3 w-3 text-purple-500" />
                          )}
                          {isAiExtracting ? "Extracting..." : "Try AI Extraction"}
                        </Badge>
                      </Button>

                      {/* Add receipt thumbnail */}
                      {selectedReceipt?.id && (
                        <div className="flex items-center">
                          <div 
                            className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
                            onClick={handleImageClick}
                          >
                            <ReceiptImageThumbnail
                              receiptId={selectedReceipt.id}
                              onClick={handleImageClick}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Add the ai model fast (thunder icon)/precise(brain icon) switcher here */}
                  </div>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedReceipt.storeName}</h3>
                  {selectedReceipt.storeAddress && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedReceipt.storeAddress}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 text-blue-500 mr-1 inline" />
                      {new Date(selectedReceipt.purchaseDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <ShoppingCart className="w-3 h-3 text-green-500 ml-1 inline" />
                      <span className="ml-1">{selectedReceipt.items?.length || 0}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      €{selectedReceipt.totalAmount?.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Wand2 className="w-3 h-3 text-orange-500 mr-1 inline" />
                      2000 kcal
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedReceipt.processed && selectedReceipt.items ? (
                <>
                  <div className="overflow-y-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          {/* <TableHead className="text-right">Actions</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceipt.items.map((item: ReceiptItem, index: number) => {
                          const Icon = categoryIcons[item.category || 'Other'];
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{capitalizeFirstLetter(item.name)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="h-4 w-4" style={{ color: defaultCategories[item.category as CategoryName].color }} />}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                              {/* <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleManageCategory(item)}>MC</Button>
                              </TableCell> */}
                            </TableRow>
                          );
                        })}
                        {/* <TableRow>
                          <TableCell colSpan={2} className="font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold">
                            €{selectedReceipt.totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow> */}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                    >
                      Delete Receipt
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedReceipt(null);
                        handleViewItems(selectedReceipt.id);
                      }}
                    >
                      Edit Items
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Receipt is being processed...
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Receipt Image Viewer Dialog */}
      {selectedReceipt?.id && (
        <ReceiptImageViewer
          receiptId={selectedReceipt.id}
          open={imageViewerOpen}
          onClose={() => {
            console.log('🔒 Closing image viewer');
            setImageViewerOpen(false);
          }}
        />
      )}
      {/* {isCategoryManagerOpen && (
        <CategoryManager item={selectedItem} onClose={() => setCategoryManagerOpen(false)} />
      )} */}
    </div>
  );
};