import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, QueryFailedError, Repository } from "typeorm";
import {
  DuplicateSkuError,
  InsufficientStockError,
  ProductNotFoundError,
} from "./errors";
import { Product } from "./product.entity";
import {
  CategoryStat,
  IProductRepository,
  NewProduct,
  ProductFilter,
  StockItem,
} from "./product.repository.interface";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class TypeOrmProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: NewProduct): Promise<Product> {
    try {
      return await this.products.save(this.products.create(data));
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new DuplicateSkuError(data.sku);
      }
      throw err;
    }
  }

  findById(id: string): Promise<Product | null> {
    return this.products.findOne({ where: { id } });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.products.findOne({ where: { sku } });
  }

  search(filter: ProductFilter): Promise<Product[]> {
    const qb = this.products.createQueryBuilder("p");

    if (!filter.includeInactive) {
      qb.andWhere("p.isActive = :active", { active: true });
    }
    if (filter.search) {
      // \, % va _ ni oddiy belgi qilamiz (avval \ — tartib muhim)
      const escaped = filter.search.replace(/[\\%_]/g, "\\$&");
      qb.andWhere(
        "(p.name ILIKE :search ESCAPE '\\' OR p.sku ILIKE :search ESCAPE '\\')",
        { search: `%${escaped}%` },
      );
    }
    if (filter.category) {
      qb.andWhere("p.category = :category", { category: filter.category });
    }
    if (filter.minPrice !== undefined) {
      qb.andWhere("p.price >= :minPrice", { minPrice: filter.minPrice });
    }
    if (filter.maxPrice !== undefined) {
      qb.andWhere("p.price <= :maxPrice", { maxPrice: filter.maxPrice });
    }

    return qb.orderBy("p.name", "ASC").addOrderBy("p.sku", "ASC").getMany();
  }

  findLowStock(): Promise<Product[]> {
    return this.products
      .createQueryBuilder("p")
      .where("p.isActive = :active", { active: true })
      .andWhere("p.quantity <= p.reorderLevel")
      .orderBy("p.quantity", "ASC")
      .addOrderBy("p.name", "ASC")
      .getMany();
  }

  async getCategoryStats(): Promise<CategoryStat[]> {
    const rows = await this.products
      .createQueryBuilder("p")
      .select("p.category", "category")
      .addSelect("COUNT(*)", "productCount")
      .addSelect("COALESCE(SUM(p.quantity), 0)", "totalQuantity")
      .addSelect("COALESCE(SUM(p.price * p.quantity), 0)", "totalValue")
      .where("p.isActive = :active", { active: true })
      .groupBy("p.category")
      .orderBy("p.category", "ASC")
      .getRawMany();

    return rows.map((r) => ({
      category: r.category,
      productCount: Number(r.productCount),
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  decrementStockMany(items: StockItem[]): Promise<Product[]> {
    return this.dataSource.transaction(async (manager) => {
      // Deadlock'dan saqlanish: qatorlarni doim bir xil (sku) tartibida bloklaymiz.
      const lockOrder = [...items].sort((a, b) =>
        a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0,
      );

      for (const item of lockOrder) {
        // Atomik: tekshiruv va yozuv bitta UPDATE ichida (o'qi→tekshir→yoz emas)
        const result = await manager
          .createQueryBuilder()
          .update(Product)
          .set({ quantity: () => '"quantity" - :qty' })
          .where('"sku" = :sku AND "isActive" = true AND "quantity" >= :qty')
          .setParameters({ sku: item.sku, qty: item.quantity })
          .execute();

        if (!result.affected) {
          // Sabab ikkita: mahsulot yo'q/nofaol yoki zaxira yetmaydi
          const current = await manager.findOneBy(Product, {
            sku: item.sku,
            isActive: true,
          });
          if (!current) throw new ProductNotFoundError(item.sku);
          throw new InsufficientStockError(
            item.sku,
            item.quantity,
            current.quantity,
          );
        }
      }

      const rows = await manager.findBy(Product, {
        sku: In(items.map((i) => i.sku)),
      });
      const bySku = new Map(rows.map((p) => [p.sku, p]));
      return items.map((i) => bySku.get(i.sku)!);
    });
  }
}
