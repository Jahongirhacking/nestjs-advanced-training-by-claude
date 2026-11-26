import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { InsufficientStockError, ProductNotFoundError } from "./errors";
import { Product } from "./product.entity";
import {
  CategoryStat,
  IProductRepository,
  NewProduct,
  ProductFilter,
  StockItem,
} from "./product.repository.interface";

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  create(data: NewProduct): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  findById(id: string): Promise<Product | null> {
    const product = this.productRepository.findOne({ where: { id } });
    if (!product) throw new ProductNotFoundError();
    return product;
  }

  findBySku(sku: string): Promise<Product | null> {
    const product = this.productRepository.findOne({ where: { sku } });
    if (!product) throw new ProductNotFoundError();
    return product;
  }

  findLowStock(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder("p")
      .where("p.quantity <= p.reorderLevel")
      .getMany();
  }

  search(filter: ProductFilter): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder("p");
    if (filter.search) {
      query.andWhere("p.name ILIKE :search", {
        search: `%${filter.search}%`,
      });
    }
    if (filter.category) {
      query.andWhere("p.category = :category", {
        category: filter.category,
      });
    }
    if (filter.maxPrice) {
      query.andWhere("p.price <= :maxPrice", {
        maxPrice: filter.maxPrice,
      });
    }
    if (filter.minPrice) {
      query.andWhere("p.price <= :minPrice", {
        minPrice: filter.minPrice,
      });
    }
    if (!filter.includeInactive) {
      query.andWhere("p.isActive <= :isActive", {
        isActive: true,
      });
    }
    return query.getMany();
  }

  async getCategoryStats(): Promise<CategoryStat[]> {
    const query = await this.productRepository
      .createQueryBuilder("p")
      .addSelect("p.category", "category")
      .addSelect("COUNT(p.id)", "productCount")
      .addSelect("COALESCE(SUM(p.quantity), 0)", "totalQuantity")
      .addSelect("COALESCE(SUM(p.quantity * p.price), 0)", "totalValue")
      .groupBy("p.category")
      .getRawMany();
    return query.map((item) => ({
      category: item.category,
      productCount: Number(item.productCount),
      totalQuantity: Number(item.totalQuantity),
      totalValue: Number(item.totalValue),
    }));
  }

  decrementStockMany(items: StockItem[]): Promise<Product[]> {
    return this.dataSource.transaction(async (entityManager) => {
      const updatedProducts: Product[] = [];
      for (const item of items) {
        const product = await entityManager.findOneBy(Product, {
          sku: item.sku,
        });
        if (!product) throw new ProductNotFoundError();
        if (product?.quantity < item.quantity)
          throw new InsufficientStockError();
        product.quantity -= item.quantity;
        const updatedProduct = await entityManager.save(Product, product);
        updatedProducts.push(updatedProduct);
      }
      return updatedProducts;
    });
  }
}
