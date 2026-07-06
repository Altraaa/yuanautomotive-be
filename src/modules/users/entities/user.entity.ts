import { Exclude } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole } from '../../../common/enums';

@Entity('users')
export class User extends BaseEntity {
  @Index('IDX_users_email', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  email: string;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  /** bcrypt/argon2 hash — never serialized to any response. */
  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password_hash: string;

  /** Hash of the currently-valid refresh token (rotation). Never exposed. */
  @Exclude()
  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refresh_token_hash: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
  role: UserRole;
}
