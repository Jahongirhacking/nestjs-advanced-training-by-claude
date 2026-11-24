/**
 * UNIT TESTLAR — InventoryService (bazasiz!).
 * Maqsad: biznes qoidalari va xatolarni HTTP'ga o'girish service'da to'g'ri ekanini tekshirish.
 * Service faqat IProductRepository interfeysiga tayanishi KERAK — shuning uchun TypeORM yo'q.
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InventoryService } from '../src/products/inventory.service';
import { PRODUCT_REPOSITORY } from '../src/products/product.repository.interface';
import { InMemoryProductRepository } from './helpers/in-memory-product.repository';
import { makeProduct } from './helpers/factories';

describe('InventoryService (unit)', () => {
  let service: InventoryService;
  let repo: InMemoryProductRepository;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [InventoryService, { provide: PRODUCT_REPOSITORY, useValue: repo }],
    }).compile();
    service = moduleRef.get(InventoryService);
  });

  describe('registerProduct', () => {
    it('yangi mahsulotni yaratadi va qaytaradi', async () => {
      const p = await service.registerProduct(makeProduct({ sku: 'A-1', name: 'Olma' }));
      expect(p.sku).toBe('A-1');
      expect(p.id).toBeDefined();
      expect(repo.items).toHaveLength(1);
    });

    it('SKU band bo\'lsa ConflictException tashlaydi va yangi yozuv yaratmaydi', async () => {
      await service.registerProduct(makeProduct({ sku: 'DUP' }));
      const createSpy = jest.spyOn(repo, 'create');
      await expect(service.registerProduct(makeProduct({ sku: 'DUP' }))).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('getProduct', () => {
    it('mavjud mahsulotni qaytaradi', async () => {
      const created = await repo.create(makeProduct());
      await expect(service.getProduct(created.id)).resolves.toMatchObject({ id: created.id });
    });

    it('topilmasa NotFoundException', async () => {
      await expect(service.getProduct('00000000-0000-4000-8000-000000000000')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listProducts', () => {
    it('filterni o\'zgartirmasdan repository.search ga uzatadi', async () => {
      const spy = jest.spyOn(repo, 'search');
      const filter = { search: 'ol', category: 'meva', minPrice: 1, maxPrice: 9, includeInactive: true };
      await service.listProducts(filter);
      expect(spy).toHaveBeenCalledWith(filter);
    });
  });

  describe('getRestockReport', () => {
    it('kam qolgan mahsulotlar uchun suggestedOrder = reorderLevel*2 - quantity', async () => {
      await repo.create(makeProduct({ sku: 'L1', name: 'Past', quantity: 2, reorderLevel: 10 }));
      await repo.create(makeProduct({ sku: 'L2', name: 'Nol', quantity: 0, reorderLevel: 4 }));
      await repo.create(makeProduct({ sku: 'OK', name: 'Yetarli', quantity: 50, reorderLevel: 10 }));

      const report = await service.getRestockReport();

      expect(report.count).toBe(2);
      expect(report.items).toEqual([
        { sku: 'L2', name: 'Nol', quantity: 0, reorderLevel: 4, suggestedOrder: 8 },
        { sku: 'L1', name: 'Past', quantity: 2, reorderLevel: 10, suggestedOrder: 18 },
      ]);
    });

    it('kam qolgan mahsulot bo\'lmasa bo\'sh hisobot', async () => {
      await repo.create(makeProduct({ quantity: 100 }));
      await expect(service.getRestockReport()).resolves.toEqual({ count: 0, items: [] });
    });
  });

  describe('sell — validatsiya (repository umuman chaqirilmasligi kerak)', () => {
    let spy: jest.SpyInstance;
    beforeEach(() => {
      spy = jest.spyOn(repo, 'decrementStockMany');
    });

    it.each([
      ['bo\'sh ro\'yxat', []],
      ['takroriy sku', [{ sku: 'A', quantity: 1 }, { sku: 'A', quantity: 2 }]],
      ['quantity = 0', [{ sku: 'A', quantity: 0 }]],
      ['quantity < 0', [{ sku: 'A', quantity: -3 }]],
      ['quantity kasr', [{ sku: 'A', quantity: 1.5 }]],
    ])('%s -> BadRequestException', async (_name, items) => {
      await expect(service.sell({ items })).rejects.toBeInstanceOf(BadRequestException);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('sell — biznes qoidalari', () => {
    beforeEach(async () => {
      await repo.create(makeProduct({ sku: 'APL', price: 2.5, quantity: 10 }));
      await repo.create(makeProduct({ sku: 'DIME', price: 0.1, quantity: 100 }));
      await repo.create(makeProduct({ sku: 'LAST', price: 7, quantity: 1 }));
    });

    it('jami summa va qatorlarni (kiritilgan tartibda) qaytaradi, ombor kamayadi', async () => {
      const res = await service.sell({
        items: [
          { sku: 'LAST', quantity: 1 },
          { sku: 'APL', quantity: 4 },
        ],
      });

      expect(res.lines).toEqual([
        { sku: 'LAST', quantity: 1, unitPrice: 7, lineTotal: 7 },
        { sku: 'APL', quantity: 4, unitPrice: 2.5, lineTotal: 10 },
      ]);
      expect(res.total).toBe(17);
      expect((await repo.findBySku('APL'))!.quantity).toBe(6);
    });

    it('suzuvchi nuqta xatosiz: 0.10 x 3 = 0.30 (tiyin aniqligida yaxlitlanadi)', async () => {
      const res = await service.sell({ items: [{ sku: 'DIME', quantity: 3 }] });
      expect(res.total).toBe(0.3);
      expect(res.lines[0].lineTotal).toBe(0.3);
    });

    it('noma\'lum sku -> NotFoundException', async () => {
      await expect(service.sell({ items: [{ sku: 'NOPE', quantity: 1 }] })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('zaxira yetmasa -> ConflictException va hech narsa o\'zgarmaydi', async () => {
      await expect(
        service.sell({
          items: [
            { sku: 'APL', quantity: 5 },
            { sku: 'LAST', quantity: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect((await repo.findBySku('APL'))!.quantity).toBe(10);
    });

    it('kutilmagan xatoni (masalan baza o\'chgan) 4xx ga o\'girmaydi — o\'zini qaytaradi', async () => {
      const boom = new Error('db down');
      jest.spyOn(repo, 'decrementStockMany').mockRejectedValueOnce(boom);
      await expect(service.sell({ items: [{ sku: 'APL', quantity: 1 }] })).rejects.toBe(boom);
    });
  });
});
