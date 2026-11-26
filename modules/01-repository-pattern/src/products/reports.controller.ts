import { Controller, Get } from "@nestjs/common";
import { InventoryService } from "./inventory.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("restock")
  restock() {
    return this.inventory.getRestockReport();
  }

  @Get("categories")
  categories() {
    return this.inventory.getCategoryStats();
  }
}
