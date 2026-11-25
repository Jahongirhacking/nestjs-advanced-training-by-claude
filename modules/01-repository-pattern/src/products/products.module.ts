import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryService } from "./inventory.service";
import { Product } from "./product.entity";
import { ProductRepository } from "./product.repository";
import { PRODUCT_REPOSITORY } from "./product.repository.interface";

@Module({
  providers: [
    InventoryService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepository,
    },
  ],
  imports: [TypeOrmModule.forFeature([Product])],
})
export class ProductsModule {}
