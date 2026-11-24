/**
 * BONUS TESTLAR (majburiy emas, lekin professional darajani ko'rsatadi).
 * Ishga tushirish: npm run test:m01:bonus
 */
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { testDbOptions } from '../../../shared/testing/test-db';
import { Product } from '../src/products/product.entity';
import { ProductsModule } from '../src/products/products.module';
import { InventoryService } from '../src/products/inventory.service';
import { makeProduct } from './helpers/factories';

describe('[BONUS] Concurrency va deadlock', () => {
  let moduleRef: TestingModule;
  let service: InventoryService;
  let ds: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbOptions([Product])), ProductsModule],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(InventoryService);
    ds = moduleRef.get(DataSource);
  });
  afterAll(async () => moduleRef.close());
  beforeEach(async () => ds.getRepository(Product).clear());

  it('DEADLOCK: qarama-qarshi tartibdagi parallel sotuvlar hammasi muvaffaqiyatli o\'tadi', async () => {
    await service.registerProduct(makeProduct({ sku: 'A', quantity: 1000 }));
    await service.registerProduct(makeProduct({ sku: 'B', quantity: 1000 }));

    const jobs = Array.from({ length: 20 }, (_, i) =>
      service.sell({
        items:
          i % 2 === 0
            ? [{ sku: 'A', quantity: 1 }, { sku: 'B', quantity: 1 }]
            : [{ sku: 'B', quantity: 1 }, { sku: 'A', quantity: 1 }],
      }),
    );
    const results = await Promise.allSettled(jobs);

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(0);
    const rows = await ds.getRepository(Product).find({ order: { sku: 'ASC' } });
    expect(rows.map((r) => r.quantity)).toEqual([980, 980]);
  });

  it('RACE: bir xil SKU bilan parallel ro\'yxatdan o\'tkazish — bittasi yaratiladi, qolganlari 409 (500 emas!)', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => service.registerProduct(makeProduct({ sku: 'RACE' }))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    (results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]).forEach((r) =>
      expect(r.reason).toBeInstanceOf(ConflictException),
    );
  });
});
