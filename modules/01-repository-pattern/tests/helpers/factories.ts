import { NewProduct } from '../../src/products/product.repository.interface';

let counter = 0;

/** Test ma'lumoti yasovchi: faqat kerakli maydonlarni override qilasiz. */
export function makeProduct(overrides: Partial<NewProduct> = {}): NewProduct {
  counter += 1;
  return {
    sku: `SKU-${String(counter).padStart(4, '0')}`,
    name: `Product ${counter}`,
    category: 'general',
    price: 10,
    quantity: 10,
    ...overrides,
  };
}
