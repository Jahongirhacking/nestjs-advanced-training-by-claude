/**
 * INTEGRATION TESTLAR — haqiqiy PostgreSQL bilan (docker compose up -d).
 * Maqsad: repository SQL darajasida to'g'ri ishlashini tekshirish:
 * Query Builder, tur konvertatsiyasi (numeric -> number), constraint'lar, tranzaksiya, concurrency.
 */
import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { testDbOptions } from '../../../shared/testing/test-db';
import { Product } from '../src/products/product.entity';
import { ProductsModule } from '../src/products/products.module';
import { IProductRepository, PRODUCT_REPOSITORY } from '../src/products/product.repository.interface';
import { InsufficientStockError, ProductNotFoundError } from '../src/products/errors';
import { makeProduct } from './helpers/factories';

describe('ProductRepository (integration, PostgreSQL)', () => {
  let moduleRef: TestingModule;
  let repo: IProductRepository;
  let ds: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbOptions([Product])), ProductsModule],
    }).compile();
    await moduleRef.init();
    repo = moduleRef.get<IProductRepository>(PRODUCT_REPOSITORY);
    ds = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await ds.getRepository(Product).clear();
  });

  describe('create / find', () => {
    it('uuid id, standart qiymatlar va createdAt bilan saqlaydi', async () => {
      const p = await repo.create(makeProduct({ sku: 'X1', name: 'Olma' }));
      expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(p.reorderLevel).toBe(5);
      expect(p.isActive).toBe(true);
      expect(p.createdAt).toBeInstanceOf(Date);
    });

    it('price numeric(12,2) — JS da STRING emas, NUMBER bo\'lib qaytadi', async () => {
      const created = await repo.create(makeProduct({ price: 19.99 }));
      const loaded = await repo.findById(created.id);
      expect(typeof created.price).toBe('number');
      expect(typeof loaded!.price).toBe('number');
      expect(loaded!.price).toBe(19.99);
    });

    it('SKU unikal: takroriy sku bazada rad etiladi', async () => {
      await repo.create(makeProduct({ sku: 'SAME' }));
      await expect(repo.create(makeProduct({ sku: 'SAME' }))).rejects.toBeDefined();
      expect(await ds.getRepository(Product).count()).toBe(1);
    });

    it('bazaning o\'zi manfiy quantity ga yo\'l qo\'ymaydi (CHECK constraint)', async () => {
      const p = await repo.create(makeProduct({ quantity: 3 }));
      await expect(ds.getRepository(Product).update({ id: p.id }, { quantity: -1 })).rejects.toBeDefined();
    });

    it('findById / findBySku: topilsa qaytaradi, topilmasa null', async () => {
      const p = await repo.create(makeProduct({ sku: 'FIND-ME' }));
      expect((await repo.findById(p.id))!.sku).toBe('FIND-ME');
      expect((await repo.findBySku('FIND-ME'))!.id).toBe(p.id);
      expect(await repo.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
      expect(await repo.findBySku('yo\'q')).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await repo.create(makeProduct({ sku: 'FR-001', name: 'Banana', category: 'meva', price: 12 }));
      await repo.create(makeProduct({ sku: 'FR-002', name: 'Apple', category: 'meva', price: 8.5 }));
      await repo.create(makeProduct({ sku: 'VG-001', name: 'Carrot', category: 'sabzavot', price: 3 }));
      await repo.create(makeProduct({ sku: 'SW-100', name: 'Sale 50% Candy', category: 'shirinlik', price: 50 }));
      await repo.create(makeProduct({ sku: 'OLD-1', name: 'Archived Pear', category: 'meva', price: 9, isActive: false }));
    });

    const names = (list: Product[]) => list.map((p) => p.name);

    it('filtersiz: faqat faol mahsulotlar, name bo\'yicha A→Z', async () => {
      expect(names(await repo.search({}))).toEqual(['Apple', 'Banana', 'Carrot', 'Sale 50% Candy']);
    });

    it('includeInactive: true — nofaollarni ham qo\'shadi', async () => {
      expect(names(await repo.search({ includeInactive: true }))).toContain('Archived Pear');
    });

    it('search: nom bo\'yicha, katta-kichik harfga befarq', async () => {
      expect(names(await repo.search({ search: 'aPPle' }))).toEqual(['Apple']);
    });

    it('search: sku bo\'yicha ham topadi', async () => {
      expect(names(await repo.search({ search: 'vg-0' }))).toEqual(['Carrot']);
    });

    it('search: "%" va "_" oddiy belgi sifatida qidiriladi (wildcard emas)', async () => {
      expect(names(await repo.search({ search: '%' }))).toEqual(['Sale 50% Candy']);
      expect(await repo.search({ search: '_' })).toEqual([]);
    });

    it('search: SQL injection urinishi zararsiz', async () => {
      expect(await repo.search({ search: "'; DROP TABLE products; --" })).toEqual([]);
      expect((await repo.search({})).length).toBe(4);
    });

    it('category: aniq moslik', async () => {
      expect(names(await repo.search({ category: 'meva' }))).toEqual(['Apple', 'Banana']);
    });

    it('narx oralig\'i chegaralarni QO\'SHIB hisoblaydi (>= va <=)', async () => {
      expect(names(await repo.search({ minPrice: 8.5, maxPrice: 12 }))).toEqual(['Apple', 'Banana']);
    });

    it('faqat minPrice yoki faqat maxPrice ishlaydi', async () => {
      expect(names(await repo.search({ minPrice: 12 }))).toEqual(['Banana', 'Sale 50% Candy']);
      expect(names(await repo.search({ maxPrice: 3 }))).toEqual(['Carrot']);
    });

    it('filtrlar birga (AND) ishlaydi', async () => {
      expect(
        names(await repo.search({ category: 'meva', search: 'an', maxPrice: 20, includeInactive: true })),
      ).toEqual(['Banana']);
    });

    it('hech narsa topilmasa bo\'sh massiv', async () => {
      expect(await repo.search({ search: 'zzz-yo\'q' })).toEqual([]);
    });
  });

  describe('findLowStock', () => {
    it('quantity <= reorderLevel (ustun bilan ustun taqqoslanadi), faqat faol, kamidan ko\'pga', async () => {
      await repo.create(makeProduct({ sku: 'A', name: 'Beta', quantity: 3, reorderLevel: 5 }));
      await repo.create(makeProduct({ sku: 'B', name: 'Alfa', quantity: 3, reorderLevel: 3 })); // teng — kiradi
      await repo.create(makeProduct({ sku: 'C', name: 'Gamma', quantity: 0, reorderLevel: 1 }));
      await repo.create(makeProduct({ sku: 'D', name: 'Delta', quantity: 4, reorderLevel: 3 })); // yetarli
      await repo.create(makeProduct({ sku: 'E', name: 'Eski', quantity: 0, reorderLevel: 9, isActive: false }));

      const low = await repo.findLowStock();

      expect(low.map((p) => p.sku)).toEqual(['C', 'B', 'A']); // quantity ASC, so'ng name ASC
    });
  });

  describe('getCategoryStats', () => {
    it('faol mahsulotlar bo\'yicha kategoriya kesimida son, zaxira va qiymat (number turida)', async () => {
      await repo.create(makeProduct({ category: 'meva', price: 10, quantity: 3 }));
      await repo.create(makeProduct({ category: 'meva', price: 2.5, quantity: 4 }));
      await repo.create(makeProduct({ category: 'sabzavot', price: 1, quantity: 100 }));
      await repo.create(makeProduct({ category: 'meva', price: 999, quantity: 999, isActive: false }));

      const stats = await repo.getCategoryStats();

      expect(stats).toHaveLength(2);
      expect(stats[0].category).toBe('meva'); // category ASC
      expect(stats[0].productCount).toBe(2);
      expect(stats[0].totalQuantity).toBe(7);
      expect(stats[0].totalValue).toBeCloseTo(40, 2);
      expect(typeof stats[0].productCount).toBe('number');
      expect(typeof stats[0].totalQuantity).toBe('number');
      expect(typeof stats[0].totalValue).toBe('number');
      expect(stats[1]).toMatchObject({ category: 'sabzavot', productCount: 1, totalQuantity: 100 });
    });

    it('mahsulot bo\'lmasa bo\'sh massiv', async () => {
      expect(await repo.getCategoryStats()).toEqual([]);
    });
  });

  describe('decrementStockMany (tranzaksiya)', () => {
    const qty = async (sku: string) => (await repo.findBySku(sku))!.quantity;

    it('bir nechta mahsulot zaxirasini kamaytiradi va yangilangan holatni kiritilgan tartibda qaytaradi', async () => {
      await repo.create(makeProduct({ sku: 'A', quantity: 10 }));
      await repo.create(makeProduct({ sku: 'B', quantity: 5 }));

      const updated = await repo.decrementStockMany([
        { sku: 'B', quantity: 2 },
        { sku: 'A', quantity: 10 },
      ]);

      expect(updated.map((p) => [p.sku, p.quantity])).toEqual([['B', 3], ['A', 0]]);
      expect(await qty('A')).toBe(0); // aynan nolgacha sotish mumkin
      expect(await qty('B')).toBe(3);
    });

    it('ProductNotFoundError: noma\'lum sku (xato obyektida sku bor)', async () => {
      await repo.create(makeProduct({ sku: 'A', quantity: 10 }));
      const err = await repo.decrementStockMany([{ sku: 'GHOST', quantity: 1 }]).catch((e) => e);
      expect(err).toBeInstanceOf(ProductNotFoundError);
      expect(err.sku).toBe('GHOST');
    });

    it('nofaol mahsulot sotilmaydi (ProductNotFoundError)', async () => {
      await repo.create(makeProduct({ sku: 'OLD', quantity: 10, isActive: false }));
      await expect(repo.decrementStockMany([{ sku: 'OLD', quantity: 1 }])).rejects.toBeInstanceOf(
        ProductNotFoundError,
      );
    });

    it('InsufficientStockError: sku, requested, available maydonlari bilan', async () => {
      await repo.create(makeProduct({ sku: 'A', quantity: 2 }));
      const err = await repo.decrementStockMany([{ sku: 'A', quantity: 5 }]).catch((e) => e);
      expect(err).toBeInstanceOf(InsufficientStockError);
      expect(err).toMatchObject({ sku: 'A', requested: 5, available: 2 });
    });

    it('ATOMIKLIK: ikkinchi element yetmasa, birinchisi ham o\'zgarmaydi (rollback)', async () => {
      await repo.create(makeProduct({ sku: 'A', quantity: 10 }));
      await repo.create(makeProduct({ sku: 'B', quantity: 1 }));

      await expect(
        repo.decrementStockMany([
          { sku: 'A', quantity: 4 },
          { sku: 'B', quantity: 2 },
        ]),
      ).rejects.toBeInstanceOf(InsufficientStockError);

      expect(await qty('A')).toBe(10);
      expect(await qty('B')).toBe(1);
    });

    it('ATOMIKLIK: oxirgi element noma\'lum bo\'lsa ham oldingilari rollback bo\'ladi', async () => {
      await repo.create(makeProduct({ sku: 'A', quantity: 10 }));
      await expect(
        repo.decrementStockMany([
          { sku: 'A', quantity: 4 },
          { sku: 'GHOST', quantity: 1 },
        ]),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(await qty('A')).toBe(10);
    });

    it('CONCURRENCY: zaxira 3 ta, 6 ta parallel xarid -> aynan 3 tasi o\'tadi, zaxira manfiy bo\'lmaydi', async () => {
      await repo.create(makeProduct({ sku: 'HOT', quantity: 3 }));

      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => repo.decrementStockMany([{ sku: 'HOT', quantity: 1 }])),
      );

      const ok = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(ok).toHaveLength(3);
      expect(failed).toHaveLength(3);
      failed.forEach((f) => expect(f.reason).toBeInstanceOf(InsufficientStockError));
      expect(await qty('HOT')).toBe(0);
    });
  });
});
