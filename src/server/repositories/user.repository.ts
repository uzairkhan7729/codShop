import type { Address, Prisma, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type Paginated,
  type PaginationParams,
  type UserWithCounts,
  toPaginated,
} from './types';

/** IUserRepository — auth, profile, addresses, admin customer listing. */
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: Prisma.UserCreateInput): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  setBlocked(id: string, blocked: boolean): Promise<User>;
  findManyCustomers(
    search: string | undefined,
    pagination: PaginationParams,
  ): Promise<Paginated<UserWithCounts>>;
  countByRole(): Promise<{ customers: number; admins: number }>;

  // Addresses
  listAddresses(userId: string): Promise<Address[]>;
  findAddress(userId: string, addressId: string): Promise<Address | null>;
  createAddress(userId: string, data: Omit<Prisma.AddressCreateInput, 'user'>): Promise<Address>;
  updateAddress(addressId: string, data: Prisma.AddressUpdateInput): Promise<Address>;
  deleteAddress(addressId: string): Promise<void>;
  clearDefault(userId: string, type: Address['type']): Promise<void>;
}

export class UserRepository implements IUserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  setBlocked(id: string, blocked: boolean): Promise<User> {
    return prisma.user.update({ where: { id }, data: { isBlocked: blocked } });
  }

  async findManyCustomers(
    search: string | undefined,
    pagination: PaginationParams,
  ): Promise<Paginated<UserWithCounts>> {
    const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  async countByRole(): Promise<{ customers: number; admins: number }> {
    const [customers, admins] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);
    return { customers, admins };
  }

  listAddresses(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findAddress(userId: string, addressId: string): Promise<Address | null> {
    return prisma.address.findFirst({ where: { id: addressId, userId } });
  }

  createAddress(userId: string, data: Omit<Prisma.AddressCreateInput, 'user'>): Promise<Address> {
    return prisma.address.create({ data: { ...data, user: { connect: { id: userId } } } });
  }

  updateAddress(addressId: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return prisma.address.update({ where: { id: addressId }, data });
  }

  async deleteAddress(addressId: string): Promise<void> {
    await prisma.address.delete({ where: { id: addressId } });
  }

  async clearDefault(userId: string, type: Address['type']): Promise<void> {
    await prisma.address.updateMany({
      where: { userId, type, isDefault: true },
      data: { isDefault: false },
    });
  }
}
