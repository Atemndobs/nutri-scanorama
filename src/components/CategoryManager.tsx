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
import { Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { Category, CategoryName } from '@/types/categories';
import { processReceiptWithOllama } from '../lib/ollama-service';
import { CategoryMapping } from '../lib/db';

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>('Other');
  const [categoryMappingsState, setCategoryMappings] = useState([]);
  const [poorlyExtractedText, setPoorlyExtractedText] = useState('');

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
  };

  const handleDeleteMapping = async (id: number) => {
    await db.categoryMappings.delete(id);
    fetchCategoryMappings();
  };

  const handleCategorizeItems = async (rawItemsText: string) => {
    try {
      const categorizedItems = await processReceiptWithOllama(rawItemsText);
      // Assuming categorizedItems is an array of { keyword, category }
      for (const item of categorizedItems) {
        const categoryMapping: CategoryMapping = {
          keyword: item.keyword, // Ensure this exists
          category: item.category // Ensure this exists
        };
        await db.categoryMappings.add(categoryMapping);
      }
      fetchCategoryMappings(); // Refresh the mappings
    } catch (error) {
      console.error('Error categorizing items:', error);
    }
  };

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
        {categoryMappingsState.map((mapping) => (
          <div key={mapping.id} className="flex items-center justify-between p-2 bg-card rounded-lg">
            <div>
              <span className="font-medium">{mapping.keyword}</span>
              <span className="text-muted-foreground"> → </span>
              <span>{mapping.category}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mapping.id && handleDeleteMapping(mapping.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Input
        placeholder="Enter poorly extracted text..."
        value={poorlyExtractedText}
        onChange={(e) => setPoorlyExtractedText(e.target.value)}
      />
      <Button onClick={() => handleCategorizeItems(poorlyExtractedText)}>Categorize Poorly Extracted Items</Button>
    </div>
  );
}
