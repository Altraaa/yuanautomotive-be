import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ContactStatus } from '../../../common/enums';

/** Lead from the public /kontak form. No soft delete (CLAUDE.md — leads are hard rows). */
@Entity('contacts')
export class Contact extends BaseEntity {
  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 191 })
  email: string;

  @Column({ name: 'vehicle_model', type: 'varchar', length: 191, nullable: true })
  vehicle_model: string | null;

  @Column({ type: 'text' })
  message: string;

  @Index('IDX_contacts_status')
  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.NEW })
  status: ContactStatus;
}
