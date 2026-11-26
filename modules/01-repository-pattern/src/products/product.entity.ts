import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("products")
@Check('"quantity" >= 0')
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
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: {
      // DB -> JS: numeric string bo'lib keladi, number'ga o'giramiz
      from: (value: string | null) => (value === null ? value : Number(value)),
      // JS -> DB
      to: (value: number) => value,
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
