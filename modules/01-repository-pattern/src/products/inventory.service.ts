import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { SellProductDto } from "./dto/sell-product.dto";
import { InsufficientStockError, ProductNotFoundError } from "./errors";
import { Product } from "./product.entity";
import {
  IProductRepository,
  IStockLineItem,
  PRODUCT_REPOSITORY,
  ProductFilter,
} from "./product.repository.interface";

@Injectable()
export class InventoryService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository,
  ) {}

  async registerProduct(createProductDto: CreateProductDto) {
    const product = await this.getProductBySku(createProductDto.sku);
    if (!!product) throw new ConflictException();
    return this.repo.create(createProductDto);
  }

  async getProduct(id: string) {
    try {
      return await this.repo.findById(id);
    } catch (err) {
      if (err instanceof ProductNotFoundError) throw new NotFoundException();
      if (err instanceof InsufficientStockError) throw new ConflictException();
      throw err;
    }
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      return this.getProductBySku(sku);
    } catch {
      return null;
    }
  }

  listProducts(filter: ProductFilter) {
    return this.repo.search(filter);
  }

  async getRestockReport() {
    try {
      const items = await this.repo.findLowStock();
      return {
        items: items.map((item) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
          suggestedOrder: item.reorderLevel * 2 - item.quantity,
        })),
        count: items.length || 0,
      };
    } catch (err) {
      if (err instanceof ProductNotFoundError) throw new NotFoundException();
      if (err instanceof InsufficientStockError) throw new ConflictException();
      throw err;
    }
  }

  async sell(dto: SellProductDto) {
    if (!dto?.items || !dto.items.length) throw new BadRequestException();
    try {
      const updatedProducts = await this.repo.decrementStockMany(dto.items);
      const lines: IStockLineItem[] = updatedProducts.map((product, idx) => ({
        sku: product.sku,
        quantity: dto.items?.[idx].quantity,
        unitPrice: product.price,
        lineTotal:
          Math.round(dto.items?.[idx].quantity * product.price * 100) / 100,
      }));
      return {
        lines,
        total: lines.reduce(
          (acc, curr) => Math.round((curr.lineTotal + acc) * 100) / 100,
          0,
        ),
      };
    } catch (err) {
      if (err instanceof ProductNotFoundError) throw new NotFoundException();
      if (err instanceof InsufficientStockError) throw new ConflictException();
      throw err;
    }
  }
}
