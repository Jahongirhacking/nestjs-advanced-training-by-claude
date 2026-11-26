import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { StockItemDto } from "./stock-item.dto";

export class SellProductDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items: StockItemDto[];
}
