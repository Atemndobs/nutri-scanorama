import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { Category, CategoryName } from '@/types/categories';
import { ollamaService } from '@/lib/ollama-service';
import { CategoryMapping } from '@/lib/db';
import { useToast } from './ui/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from './ui/badge';

type GroupedMappings = {
  [key in CategoryName]: CategoryMapping[];
};

export function CategoryManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>('Other');
  const [categoryMappingsState, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [poorlyExtractedText, setPoorlyExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const fetchedCategories = await db.categories.toArray();
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0) {
        setSelectedCategory(fetchedCategories[0].name);
      }
    };
    fetchCategories();
  }, []);

  const fetchCategoryMappings = async () => {
    const mappings = await db.categoryMappings.toArray();
    setCategoryMappings(mappings);
  };

  useEffect(() => {
    fetchCategoryMappings();
  }, []);

  const handleAddMapping = async () => {
    if (!newKeyword) return;

    await db.categoryMappings.add({
      keyword: newKeyword.toLowerCase(),
      category: selectedCategory
    });

    setNewKeyword('');
    fetchCategoryMappings();
    toast({
      title: "Mapping added",
      description: `Added "${newKeyword}" to category "${selectedCategory}"`,
    });
  };

  const handleDeleteMapping = async (id: number) => {
    await db.categoryMappings.delete(id);
    fetchCategoryMappings();
    toast({
      title: "Mapping deleted",
      description: "Category mapping has been removed",
    });
  };

  const handleCategorizeItems = async () => {
    if (!poorlyExtractedText.trim()) {
      toast({
        title: "No text provided",
        description: "Please enter some text to categorize",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const categorizedItems = await ollamaService.processCategoryText(poorlyExtractedText);
      
      for (const item of categorizedItems) {
        await db.categoryMappings.add({
          keyword: item.keyword.toLowerCase(),
          category: item.category
        });
      }
      
      fetchCategoryMappings();
      setPoorlyExtractedText('');
      toast({
        title: "Success",
        description: `Added ${categorizedItems.length} new category mappings`,
      });
    } catch (error) {
      console.error('Error categorizing items:', error);
      toast({
        title: "Error",
        description: "Failed to categorize items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const groupedMappings = categoryMappingsState.reduce<GroupedMappings>((acc, mapping) => {
    if (!acc[mapping.category]) {
      acc[mapping.category] = [];
    }
    acc[mapping.category].push(mapping);
    return acc;
  }, {} as GroupedMappings);

  const PREVIEW_ITEMS = 3;

  if (!categoryMappingsState || !categories) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter keyword..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
        />
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as CategoryName)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAddMapping}>Add</Button>
      </div>

      <div className="space-y-2">
        {Object.entries(groupedMappings).map(([category, mappings]) => (
          <Collapsible
            key={category}
            open={expandedCategories.has(category)}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted hover:bg-muted/80 rounded-lg">
              <div className="flex items-center gap-2">
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">{category}</span>
                <Badge variant="secondary" className="ml-2">
                  {mappings.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {mappings.slice(0, showAllItems ? undefined : PREVIEW_ITEMS).map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-2 ml-6 bg-card rounded-lg"
                >
                  <span className="font-medium">{mapping.keyword}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => mapping.id && handleDeleteMapping(mapping.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!showAllItems && mappings.length > PREVIEW_ITEMS && (
                <Button
                  variant="ghost"
                  className="ml-6 text-sm"
                  onClick={() => setShowAllItems(true)}
                >
                  Show {mappings.length - PREVIEW_ITEMS} more items...
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <h3 className="font-medium">AI Categorization</h3>
        <div className="space-y-2">
          <Input
            placeholder="Enter product names or descriptions to categorize..."
            value={poorlyExtractedText}
            onChange={(e) => setPoorlyExtractedText(e.target.value)}
          />
          <Button 
            onClick={handleCategorizeItems} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Categorize Items"}
          </Button>
        </div>
      </div>
    </div>
  );
}
