import { Inject, Injectable } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from "./product.repository.interface";

@Injectable()
export class InventoryService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository,
  ) {}

  registerProduct(createProductDto: CreateProductDto) {
    return this.repo.create(createProductDto);
  }
}
