import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { InventoryService } from "./inventory.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly inventory: InventoryService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.inventory.registerProduct(dto);
  }

  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.inventory.listProducts(query);
  }

  @Get(":id")
  getOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.inventory.getProduct(id);
  }
}
