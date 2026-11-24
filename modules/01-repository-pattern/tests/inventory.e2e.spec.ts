/**
 * E2E TESTLAR — HTTP qatlamidan bazagacha. Shartnoma: URL, status kod, JSON shakli.
 * ValidationPipe testda global yoqiladi (main.ts dagi kabi): sizning DTO'laringiz uni qondirishi kerak.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { testDbOptions } from '../../../shared/testing/test-db';
import { Product } from '../src/products/product.entity';
import { ProductsModule } from '../src/products/products.module';
import { IProductRepository, PRODUCT_REPOSITORY } from '../src/products/product.repository.interface';
import { makeProduct } from './helpers/factories';

describe('Inventory API (e2e)', () => {
  let app: INestApplication;
  let repo: IProductRepository;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbOptions([Product])), ProductsModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    repo = app.get<IProductRepository>(PRODUCT_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.get(DataSource).getRepository(Product).clear();
  });

  const valid = { sku: 'MILK-1', name: 'Sut 1L', category: 'sut', price: 12.5, quantity: 40 };

  describe('POST /products', () => {
    it('201: mahsulot yaratadi, price number, standart qiymatlar bilan', async () => {
      const res = await http().post('/products').send(valid).expect(201);
      expect(res.body).toMatchObject({ ...valid, reorderLevel: 5, isActive: true });
      expect(typeof res.body.price).toBe('number');
      expect(res.body.id).toBeDefined();
    });

    it('409: SKU band', async () => {
      await http().post('/products').send(valid).expect(201);
      await http().post('/products').send(valid).expect(409);
    });

    it.each([
      ['sku yo\'q', { ...valid, sku: undefined }],
      ['name bo\'sh', { ...valid, name: '' }],
      ['price manfiy', { ...valid, price: -1 }],
      ['price matn', { ...valid, price: 'qimmat' }],
      ['quantity kasr', { ...valid, quantity: 1.5 }],
      ['quantity manfiy', { ...valid, quantity: -1 }],
      ['reorderLevel manfiy', { ...valid, reorderLevel: -2 }],
      ['ruxsat etilmagan maydon', { ...valid, isAdmin: true }],
    ])('400: %s', async (_n, body) => {
      await http().post('/products').send(body).expect(400);
    });
  });

  describe('GET /products', () => {
    beforeEach(async () => {
      await repo.create(makeProduct({ sku: 'A', name: 'Apple', category: 'meva', price: 5 }));
      await repo.create(makeProduct({ sku: 'B', name: 'Banana', category: 'meva', price: 15 }));
      await repo.create(makeProduct({ sku: 'C', name: 'Carrot', category: 'sabzavot', price: 2 }));
      await repo.create(makeProduct({ sku: 'D', name: 'Date', category: 'meva', price: 9, isActive: false }));
    });
    const names = (res: request.Response) => res.body.map((p: any) => p.name);

    it('200: filtrsiz — faol mahsulotlar', async () => {
      const res = await http().get('/products').expect(200);
      expect(names(res)).toEqual(['Apple', 'Banana', 'Carrot']);
    });

    it('query parametrlar number/boolean ga to\'g\'ri o\'giriladi', async () => {
      const res = await http().get('/products?category=meva&minPrice=6&maxPrice=20').expect(200);
      expect(names(res)).toEqual(['Banana']);
    });

    it('search ishlaydi', async () => {
      expect(names(await http().get('/products?search=carr').expect(200))).toEqual(['Carrot']);
    });

    it('includeInactive=true nofaollarni qo\'shadi, includeInactive=false esa qo\'shmaydi', async () => {
      expect(names(await http().get('/products?includeInactive=true').expect(200))).toContain('Date');
      expect(names(await http().get('/products?includeInactive=false').expect(200))).not.toContain('Date');
    });

    it('400: minPrice raqam emas', async () => {
      await http().get('/products?minPrice=abc').expect(400);
    });
  });

  describe('GET /products/:id', () => {
    it('200 / 404 / 400', async () => {
      const p = await repo.create(makeProduct({ sku: 'ONE' }));
      const ok = await http().get(`/products/${p.id}`).expect(200);
      expect(ok.body.sku).toBe('ONE');
      await http().get('/products/00000000-0000-4000-8000-000000000000').expect(404);
      await http().get('/products/not-a-uuid').expect(400);
    });
  });

  describe('GET /reports/restock', () => {
    it('kam qolgan mahsulotlar hisoboti', async () => {
      await repo.create(makeProduct({ sku: 'LOW', name: 'Low', quantity: 1, reorderLevel: 5 }));
      await repo.create(makeProduct({ sku: 'FINE', name: 'Fine', quantity: 99, reorderLevel: 5 }));
      const res = await http().get('/reports/restock').expect(200);
      expect(res.body).toEqual({
        count: 1,
        items: [{ sku: 'LOW', name: 'Low', quantity: 1, reorderLevel: 5, suggestedOrder: 9 }],
      });
    });
  });

  describe('GET /reports/categories', () => {
    it('kategoriya statistikasi', async () => {
      await repo.create(makeProduct({ category: 'meva', price: 4, quantity: 5 }));
      const res = await http().get('/reports/categories').expect(200);
      expect(res.body).toEqual([{ category: 'meva', productCount: 1, totalQuantity: 5, totalValue: 20 }]);
    });
  });

  describe('POST /sales', () => {
    beforeEach(async () => {
      await repo.create(makeProduct({ sku: 'A', price: 3, quantity: 10 }));
      await repo.create(makeProduct({ sku: 'B', price: 1.5, quantity: 2 }));
    });

    it('201: sotadi, jami summani qaytaradi, zaxirani kamaytiradi', async () => {
      const res = await http()
        .post('/sales')
        .send({ items: [{ sku: 'A', quantity: 2 }, { sku: 'B', quantity: 2 }] })
        .expect(201);
      expect(res.body.total).toBe(9);
      expect(res.body.lines).toEqual([
        { sku: 'A', quantity: 2, unitPrice: 3, lineTotal: 6 },
        { sku: 'B', quantity: 2, unitPrice: 1.5, lineTotal: 3 },
      ]);
      expect((await repo.findBySku('B'))!.quantity).toBe(0);
    });

    it('409: zaxira yetmasa va hech narsa o\'zgarmaydi', async () => {
      await http()
        .post('/sales')
        .send({ items: [{ sku: 'A', quantity: 5 }, { sku: 'B', quantity: 3 }] })
        .expect(409);
      expect((await repo.findBySku('A'))!.quantity).toBe(10);
    });

    it('404: noma\'lum sku', async () => {
      await http().post('/sales').send({ items: [{ sku: 'ZZZ', quantity: 1 }] }).expect(404);
    });

    it.each([
      ['items yo\'q', {}],
      ['items bo\'sh', { items: [] }],
      ['quantity 0', { items: [{ sku: 'A', quantity: 0 }] }],
      ['quantity matn', { items: [{ sku: 'A', quantity: 'ko\'p' }] }],
      ['sku yo\'q', { items: [{ quantity: 1 }] }],
      ['takroriy sku', { items: [{ sku: 'A', quantity: 1 }, { sku: 'A', quantity: 1 }] }],
    ])('400: %s', async (_n, body) => {
      await http().post('/sales').send(body).expect(400);
    });
  });
});
