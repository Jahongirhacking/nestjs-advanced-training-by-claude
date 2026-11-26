import { Body, Controller, Post } from "@nestjs/common";
import { SellProductDto } from "./dto/sell-product.dto";
import { InventoryService } from "./inventory.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly inventory: InventoryService) {}

  @Post()
  sell(@Body() dto: SellProductDto) {
    return this.inventory.sell(dto);
  }
}
