import { IsInt, IsString, Min } from "class-validator";

export class StockItemDto {
  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
