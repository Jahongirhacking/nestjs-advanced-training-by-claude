import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("products")
@Check("quantity >= 0")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  sku: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  category: string;

  @Column({
    type: "decimal",
    transformer: {
      from: (value: string) => Number(value),
      to: (value: string) => value,
    },
  })
  price: number;

  @Column({ type: "int", default: 0 })
  quantity: number;

  @Column({ type: "int", default: 5 })
  reorderLevel: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
