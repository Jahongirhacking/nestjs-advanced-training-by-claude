import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "./product.entity";
import { IProductRepository, NewProduct } from "./product.repository.interface";

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  create(data: NewProduct): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }
}
