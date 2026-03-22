// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Ensure PrismaClient is only instantiated once in development
// Use a global variable for hot reloads (ts-node-dev / nodemon)
let prisma: PrismaClient;

declare global {
  // Add prisma to NodeJS global (only for TypeScript)
  // eslint-disable-next-line no-var
  var __prisma?: PrismaClient;
}

// Reuse the client if it already exists
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}

prisma = global.__prisma;

export { prisma };