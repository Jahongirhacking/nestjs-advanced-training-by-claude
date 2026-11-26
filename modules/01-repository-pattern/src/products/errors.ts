export class ProductNotFoundError extends Error {
  constructor(public readonly sku: string) {
    super(`Product not found: ${sku}`);
    this.name = "ProductNotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly sku: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient stock for ${sku}: requested ${requested}, available ${available}`,
    );
    this.name = "InsufficientStockError";
  }
}

/** Unikal SKU constraint buzilganda (PostgreSQL 23505) repository shuni tashlaydi. */
export class DuplicateSkuError extends Error {
  constructor(public readonly sku: string) {
    super(`SKU already exists: ${sku}`);
    this.name = "DuplicateSkuError";
  }
}
