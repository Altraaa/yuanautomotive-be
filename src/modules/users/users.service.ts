import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByUuid(uuid: string): Promise<User | null> {
    return this.repo.findOne({ where: { uuid } });
  }

  async getByUuidOrFail(uuid: string): Promise<User> {
    const user = await this.findByUuid(uuid);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<User> {
    const user = this.repo.create({
      email: data.email,
      name: data.name,
      password_hash: data.passwordHash,
      role: data.role ?? UserRole.ADMIN,
    });
    return this.repo.save(user);
  }

  async setRefreshTokenHash(uuid: string, hash: string | null): Promise<void> {
    await this.repo.update({ uuid }, { refresh_token_hash: hash });
  }
}
