export type CategoryName = 
  | 'Fruits'
  | 'Vegetables'
  | 'Dairy'
  | 'Meat'
  | 'Bakery'
  | 'Beverages'
  | 'Snacks'
  | 'Other';

export interface Category {
  id?: number;
  name: CategoryName;
  itemCount: number;
  color: string;
}

export const defaultCategories: Record<CategoryName, { color: string }> = {
  Fruits: { color: '#4CAF50' },      // Green
  Vegetables: { color: '#8BC34A' },  // Light Green
  Dairy: { color: '#FFC107' },       // Amber
  Meat: { color: '#F44336' },        // Red
  Bakery: { color: '#9C27B0' },      // Purple
  Beverages: { color: '#2196F3' },   // Blue
  Snacks: { color: '#FF9800' },      // Orange
  Other: { color: '#9E9E9E' }        // Grey
};
