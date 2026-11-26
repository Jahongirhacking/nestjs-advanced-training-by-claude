import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryService } from "./inventory.service";
import { Product } from "./product.entity";
import { PRODUCT_REPOSITORY } from "./product.repository.interface";
import { ProductsController } from "./products.controller";
import { ReportsController } from "./reports.controller";
import { SalesController } from "./sales.controller";
import { TypeOrmProductRepository } from "./typeorm-product.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController, ReportsController, SalesController],
  providers: [
    InventoryService,
    { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository },
  ],
  exports: [InventoryService, PRODUCT_REPOSITORY],
})
export class ProductsModule {}
