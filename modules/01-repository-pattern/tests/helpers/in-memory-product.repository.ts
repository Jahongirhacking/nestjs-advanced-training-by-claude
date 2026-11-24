import { randomUUID } from 'crypto';
import { Product } from '../../src/products/product.entity';
import {
  CategoryStat,
  IProductRepository,
  NewProduct,
  ProductFilter,
  StockItem,
} from '../../src/products/product.repository.interface';
import { InsufficientStockError, ProductNotFoundError } from '../../src/products/errors';

/**
 * TEST YORDAMCHISI — bazasiz (in-memory) soxta repository.
 * Bu fayl Dependency Inversion'ni isbotlaydi: InventoryService bazaga emas,
 * interfeysga tayanadi, shuning uchun uni shu soxta repository bilan sinab ko'ra olamiz.
 * (Faylni o'zgartirmang.)
 */
export class InMemoryProductRepository implements IProductRepository {
  readonly items: Product[] = [];

  async create(data: NewProduct): Promise<Product> {
    const p = Object.assign(new Product(), {
      id: randomUUID(),
      sku: data.sku,
      name: data.name,
      category: data.category,
      price: data.price,
      quantity: data.quantity,
      reorderLevel: data.reorderLevel ?? 5,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    });
    this.items.push(p);
    return { ...p } as Product;
  }

  async findById(id: string) {
    const p = this.items.find((i) => i.id === id);
    return p ? ({ ...p } as Product) : null;
  }

  async findBySku(sku: string) {
    const p = this.items.find((i) => i.sku === sku);
    return p ? ({ ...p } as Product) : null;
  }

  async search(filter: ProductFilter) {
    return this.items
      .filter((p) => filter.includeInactive || p.isActive)
      .filter((p) => !filter.category || p.category === filter.category)
      .filter((p) => filter.minPrice === undefined || p.price >= filter.minPrice)
      .filter((p) => filter.maxPrice === undefined || p.price <= filter.maxPrice)
      .filter(
        (p) =>
          !filter.search ||
          p.name.toLowerCase().includes(filter.search.toLowerCase()) ||
          p.sku.toLowerCase().includes(filter.search.toLowerCase()),
      )
      .map((p) => ({ ...p }) as Product);
  }

  async findLowStock() {
    return this.items
      .filter((p) => p.isActive && p.quantity <= p.reorderLevel)
      .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
      .map((p) => ({ ...p }) as Product);
  }

  async getCategoryStats(): Promise<CategoryStat[]> {
    return [];
  }

  async decrementStockMany(items: StockItem[]): Promise<Product[]> {
    // avval hammasini tekshiramiz (atomiklik: yarim-yorti o'zgarish bo'lmasin)
    for (const it of items) {
      const p = this.items.find((i) => i.sku === it.sku && i.isActive);
      if (!p) throw new ProductNotFoundError(it.sku);
      if (p.quantity < it.quantity) {
        throw new InsufficientStockError(it.sku, it.quantity, p.quantity);
      }
    }
    return items.map((it) => {
      const p = this.items.find((i) => i.sku === it.sku)!;
      p.quantity -= it.quantity;
      return { ...p } as Product;
    });
  }
}
