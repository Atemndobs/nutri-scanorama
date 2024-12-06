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
      categories: '++id, name, itemCount'
    });
  }
}

export const db = new CategoryMappingsDB();

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

  // Meat
  { keyword: 'spiessbraten', category: 'Meat' },
  { keyword: 'schenkel', category: 'Meat' },
  { keyword: 'fleisch', category: 'Meat' },
  { keyword: 'wurst', category: 'Meat' },
  { keyword: 'hähnchen', category: 'Meat' },
  { keyword: 'huhn', category: 'Meat' },
  { keyword: 'steak', category: 'Meat' },
  { keyword: 'schnitzel', category: 'Meat' },

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

  // Bakery
  { keyword: 'brot', category: 'Bakery' },
  { keyword: 'brötchen', category: 'Bakery' },
  { keyword: 'croissant', category: 'Bakery' },
  { keyword: 'donut', category: 'Bakery' },
  { keyword: 'pastel', category: 'Bakery' },
  { keyword: 'kuchen', category: 'Bakery' },

  // Cereals (categorized as Groceries)
  { keyword: 'müsli', category: 'Groceries' },
  { keyword: 'reis', category: 'Groceries' },
  { keyword: 'nudel', category: 'Groceries' },
  { keyword: 'pasta', category: 'Groceries' },
  { keyword: 'cornflakes', category: 'Groceries' },

  // Oils & Dressings (categorized as Groceries)
  { keyword: 'öl', category: 'Groceries' },
  { keyword: 'essig', category: 'Groceries' },
  { keyword: 'dressing', category: 'Groceries' },

  // Spices & Seasonings (categorized as Groceries)
  { keyword: 'gewürz', category: 'Groceries' },
  { keyword: 'pfeffer', category: 'Groceries' },
  { keyword: 'salz', category: 'Groceries' },
  { keyword: 'sauce', category: 'Groceries' },
  { keyword: 'senf', category: 'Groceries' },

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

  // Beverages
  { keyword: 'kaffee', category: 'Beverages' },
  { keyword: 'tee', category: 'Beverages' },
  { keyword: 'wasser', category: 'Beverages' },
  { keyword: 'saft', category: 'Beverages' },
  { keyword: 'cola', category: 'Beverages' },
  { keyword: 'bier', category: 'Beverages' },
  { keyword: 'wein', category: 'Beverages' },

  // Frozen Foods
  { keyword: 'eis', category: 'Groceries' },
  { keyword: 'tiefkühl', category: 'Groceries' },
  { keyword: 'frost', category: 'Groceries' },
  { keyword: 'gefrier', category: 'Groceries' },
];

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
      { name: 'Groceries', itemCount: 0 },
      { name: 'Beverages', itemCount: 0 },
      { name: 'Snacks', itemCount: 0 },
      { name: 'Household', itemCount: 0 },
      { name: 'Fruits', itemCount: 0 },
      { name: 'Vegetables', itemCount: 0 },
      { name: 'Dairy', itemCount: 0 },
      { name: 'Meat', itemCount: 0 },
      { name: 'Bakery', itemCount: 0 },
      { name: 'Personal Care', itemCount: 0 },
      { name: 'Other', itemCount: 0 }
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
