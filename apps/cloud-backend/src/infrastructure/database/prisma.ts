import { PrismaClient } from '@prisma/client';

// Handle BigInt JSON serialization issue
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
