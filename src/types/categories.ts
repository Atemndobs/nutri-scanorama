export type CategoryName = 
  | 'Groceries'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Fruits'
  | 'Vegetables'
  | 'Dairy'
  | 'Meat'
  | 'Bakery'
  | 'Personal Care'
  | 'Other'
  | 'Sweets';

export interface Category {
  id?: number;
  name: CategoryName;
  itemCount: number;
}
