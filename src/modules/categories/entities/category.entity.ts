import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category extends SoftDeletableEntity {
  @Index('IDX_categories_name', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Index('IDX_categories_slug', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  slug: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
