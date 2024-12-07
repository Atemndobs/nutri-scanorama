import Dexie, { Table } from 'dexie';
import type { CategoryName, Category } from '../../types/categories';

export interface CategoryMapping {
  id?: number;
  keyword: string;
  category: CategoryName;
}

export class CategoryMappingsDB extends Dexie {
  categoryMappings!: Table<CategoryMapping>;
  categories!: Table<Category>;

  constructor() {
    super('categoryMappingsDB');
    this.version(2).stores({
      categoryMappings: '++id, keyword, category',
      categories: '++id, name, itemCount, color'
    });
  }
}

export const db = new CategoryMappingsDB();

// Function to normalize keywords to lowercase for case-insensitive matching
export function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase();
}

// Normalize and clean item names before mapping
function cleanItemName(itemName: string): string {
  return itemName.toLowerCase().trim();
}

// Initial category mappings
export const defaultMappings: Omit<CategoryMapping, 'id'>[] = [
  // Fruits
  { keyword: 'mango', category: 'Fruits' },
  { keyword: 'apfel', category: 'Fruits' },
  { keyword: 'banane', category: 'Fruits' },
  { keyword: 'orange', category: 'Fruits' },
  { keyword: 'birne', category: 'Fruits' },
  { keyword: 'beere', category: 'Fruits' },

  // Vegetables
  { keyword: 'broccoli', category: 'Vegetables' },
  { keyword: 'karotte', category: 'Vegetables' },
  { keyword: 'tomate', category: 'Vegetables' },
  { keyword: 'salat', category: 'Vegetables' },
  { keyword: 'kartoffel', category: 'Vegetables' },
  { keyword: 'gemüse', category: 'Vegetables' },
  { keyword: 'avocado', category: 'Vegetables' },
  { keyword: 'kidneybohnen', category: 'Vegetables' },
  { keyword: 'pesto rosso', category: 'Vegetables' },

  // Meat
  { keyword: 'spiessbraten', category: 'Meat' },
  { keyword: 'schenkel', category: 'Meat' },
  { keyword: 'fleisch', category: 'Meat' },
  { keyword: 'wurst', category: 'Meat' },
  { keyword: 'hähnchen', category: 'Meat' },
  { keyword: 'huhn', category: 'Meat' },
  { keyword: 'steak', category: 'Meat' },
  { keyword: 'schnitzel', category: 'Meat' },
  { keyword: 'rostbratwuerste', category: 'Meat' },

  // Seafood (categorized as Meat)
  { keyword: 'fisch', category: 'Meat' },
  { keyword: 'lachs', category: 'Meat' },
  { keyword: 'thunfisch', category: 'Meat' },
  { keyword: 'garnelen', category: 'Meat' },
  { keyword: 'shrimp', category: 'Meat' },

  // Dairy
  { keyword: 'milch', category: 'Dairy' },
  { keyword: 'käse', category: 'Dairy' },
  { keyword: 'joghurt', category: 'Dairy' },
  { keyword: 'butter', category: 'Dairy' },
  { keyword: 'sahne', category: 'Dairy' },
  { keyword: 'quark', category: 'Dairy' },
  { keyword: 'old amsterdam', category: 'Dairy' },

  // Bakery
  { keyword: 'brot', category: 'Bakery' },
  { keyword: 'brötchen', category: 'Bakery' },
  { keyword: 'croissant', category: 'Bakery' },
  { keyword: 'donut', category: 'Bakery' },
  { keyword: 'pastel', category: 'Bakery' },
  { keyword: 'kuchen', category: 'Bakery' },

  // Cereals 
  { keyword: 'müsli', category: 'Cereals' },
  { keyword: 'reis', category: 'Cereals' },
  { keyword: 'nudel', category: 'Cereals' },
  { keyword: 'pasta', category: 'Cereals' },
  { keyword: 'cornflakes', category: 'Cereals' },

  // Oils & Dressings 
  { keyword: 'öl', category: 'Oils' },
  { keyword: 'essig', category: 'Oils' },
  { keyword: 'dressing', category: 'Oils' },
  { keyword: 'olivenöl', category: 'Oils' },
  { keyword: 'deli. mayonnaise', category: 'Oils' },

  // Spices & Seasonings (categorized as Other)
  { keyword: 'gewürz', category: 'Other' },
  { keyword: 'pfeffer', category: 'Other' },
  { keyword: 'salz', category: 'Other' },
  { keyword: 'sauce', category: 'Other' },
  { keyword: 'senf', category: 'Other' },

  // Snacks
  { keyword: 'chips', category: 'Snacks' },
  { keyword: 'cracker', category: 'Snacks' },
  { keyword: 'nüsse', category: 'Snacks' },
  { keyword: 'snack', category: 'Snacks' },
  { keyword: 'brezel', category: 'Snacks' },

  // Sweets
  { keyword: 'schokolade', category: 'Sweets' },
  { keyword: 'süß', category: 'Sweets' },
  { keyword: 'bonbon', category: 'Sweets' },
  { keyword: 'keks', category: 'Sweets' },
  { keyword: 'cookie', category: 'Sweets' },
  { keyword: 'eis', category: 'Sweets' },

  // Beverages
  { keyword: 'kaffee', category: 'Beverages' },
  { keyword: 'tee', category: 'Beverages' },
  { keyword: 'wasser', category: 'Beverages' },
  { keyword: 'saft', category: 'Beverages' },
  { keyword: 'cola', category: 'Beverages' },
  { keyword: 'bier', category: 'Beverages' },
  { keyword: 'wein', category: 'Beverages' },

  // Frozen Foods
  { keyword: 'tiefkühl', category: 'Other' },
  { keyword: 'frost', category: 'Other' },
  { keyword: 'gefrier', category: 'Other' },
];

export async function determineCategory(itemName: string): Promise<CategoryName> {
  const cleanedName = cleanItemName(itemName);
  console.debug('[DB MATCHING] Original name:', itemName, '| Cleaned name:', cleanedName);
  console.debug('[DB] Starting category determination for:', itemName, '->', cleanedName);

  // First check direct mappings
  const mapping = await db.categoryMappings
    .where('keyword')
    .equals(cleanedName)
    .first();

  if (mapping) {
    console.debug('[DB] Found direct mapping:', mapping);
    return mapping.category;
  }

  // Then check if any keyword is included in the name
  const mappings = await db.categoryMappings.toArray();
  for (const mapping of mappings) {
    if (cleanedName.includes(cleanItemName(mapping.keyword))) {
      console.debug('[DB] Found keyword match:', mapping);
      return mapping.category;
    }
  }

  console.debug('[DB MATCHING] No category match found, returning Other for:', itemName, '->', cleanedName);
  return 'Other';
}

// Initialize database with default mappings if empty
export async function initializeCategoryMappings() {
  console.debug('[CategoryMappings] Checking if mappings need initialization');
  const count = await db.categoryMappings.count();
  console.debug('[CategoryMappings] Current mapping count:', count);
  
  if (count === 0) {
    console.debug('[CategoryMappings] Initializing default mappings:', defaultMappings);
    await db.categoryMappings.bulkAdd(defaultMappings);
    console.debug('[CategoryMappings] Default mappings added successfully');
  } else {
    console.debug('[CategoryMappings] Mappings already exist, skipping initialization');
  }
}

// Initialize categories if empty
export async function initializeCategories() {
  const count = await db.categories.count();
  if (count === 0) {
    const defaultCategories: Omit<Category, 'id'>[] = [
      { name: 'Beverages', itemCount: 0, color: 'brown' },
      { name: 'Snacks', itemCount: 0, color: 'orange' },
      { name: 'Fruits', itemCount: 0, color: 'red' },
      { name: 'Vegetables', itemCount: 0, color: 'green' },
      { name: 'Dairy', itemCount: 0, color: 'white' },
      { name: 'Meat', itemCount: 0, color: 'pink' },
      { name: 'Bakery', itemCount: 0, color: 'gold' },
      { name: 'Other', itemCount: 0, color: 'grey' },
      { name: 'Oils', itemCount: 0, color: 'yellow' },
      { name: 'Cereals', itemCount: 0, color: 'lightbrown' },
      { name: 'Sweets', itemCount: 0, color: 'pink' },
    ];
    await db.categories.bulkAdd(defaultCategories);
  }
}

// Initialize both mappings and categories
export async function initializeDatabase() {
  await initializeCategoryMappings();
  await initializeCategories();
}

initializeDatabase();
