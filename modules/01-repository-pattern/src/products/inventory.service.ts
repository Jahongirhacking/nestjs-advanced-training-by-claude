import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DuplicateSkuError,
  InsufficientStockError,
  ProductNotFoundError,
} from "./errors";
import { Product } from "./product.entity";
import {
  CategoryStat,
  IProductRepository,
  IStockLineItem,
  NewProduct,
  PRODUCT_REPOSITORY,
  ProductFilter,
  StockItem,
} from "./product.repository.interface";

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class InventoryService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository,
  ) {}

  async registerProduct(dto: NewProduct): Promise<Product> {
    // Tez yo'l: ko'p holatda bazaga yozishga urinmaymiz
    if (await this.repo.findBySku(dto.sku)) {
      throw new ConflictException(`SKU already exists: ${dto.sku}`);
    }
    try {
      return await this.repo.create(dto);
    } catch (err) {
      // Race: tekshiruv va yaratish orasida boshqasi ulgurdi — baza unique constraint'i hal qiladi
      if (err instanceof DuplicateSkuError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  listProducts(filter: ProductFilter): Promise<Product[]> {
    return this.repo.search(filter);
  }

  async getRestockReport() {
    const products = await this.repo.findLowStock();
    return {
      count: products.length,
      items: products.map((p) => ({
        sku: p.sku,
        name: p.name,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        suggestedOrder: p.reorderLevel * 2 - p.quantity,
      })),
    };
  }

  getCategoryStats(): Promise<CategoryStat[]> {
    return this.repo.getCategoryStats();
  }

  async sell(dto: { items: StockItem[] }) {
    this.assertValidSale(dto?.items);
    const items = dto.items;

    let updated: Product[];
    try {
      updated = await this.repo.decrementStockMany(items);
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof InsufficientStockError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    const lines: IStockLineItem[] = updated.map((product, i) => ({
      sku: product.sku,
      quantity: items[i].quantity,
      unitPrice: product.price,
      lineTotal: round2(items[i].quantity * product.price),
    }));
    const total = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

    return { total, lines };
  }

  private assertValidSale(items: StockItem[] | undefined): asserts items is StockItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("items must be a non-empty array");
    }
    if (new Set(items.map((i) => i.sku)).size !== items.length) {
      throw new BadRequestException("duplicate sku in items");
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          `quantity must be a positive integer (sku: ${item.sku})`,
        );
      }
    }
  }
}
