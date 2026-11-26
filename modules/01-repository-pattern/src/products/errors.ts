export class InsufficientStockError extends Error {
  constructor(
    itemSku?: string,
    itemQuantity?: number,
    productQuantity?: number,
  ) {
    super(`${itemSku}: ${itemQuantity} > ${productQuantity}`);
  }
}

export class ProductNotFoundError extends Error {
  constructor(sku?: string) {
    super(`${sku} not found`);
  }
}
