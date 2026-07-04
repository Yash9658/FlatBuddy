import { prisma } from "./prisma.js";

function isTransientPrismaConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("terminating connection due to administrator command") ||
    message.includes("Can't reach database server") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated")
  );
}

export async function withPrismaReconnectRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientPrismaConnectionError(error)) {
      throw error;
    }

    console.warn("Retrying database operation after transient Prisma connection error.", error);
    await prisma.$disconnect();
    return operation();
  }
}
