import { Product } from "./product.entity";

export const PRODUCT_REPOSITORY = Symbol("product_repository");

export interface NewProduct {
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  reorderLevel?: number;
  isActive?: boolean;
}
export interface ProductFilter {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  includeInactive?: boolean;
}
export interface CategoryStat {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
}
export interface StockItem {
  sku: string;
  quantity: number;
}

export interface IProductRepository {
  create(data: NewProduct): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  search(filter: ProductFilter): Promise<Product[]>;
  findLowStock(): Promise<Product[]>;
  getCategoryStats(): Promise<CategoryStat[]>;
  decrementStockMany(items: StockItem[]): Promise<Product[]>;
}
