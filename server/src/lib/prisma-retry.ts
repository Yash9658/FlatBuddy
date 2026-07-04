import { prisma } from "./prisma.js";

function isTransientPrismaConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("kind: Closed") ||
    message.includes("terminating connection due to administrator command") ||
    message.includes("Can't reach database server") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated")
  );
}

export async function withPrismaReconnectRetry<T>(operation: () => Promise<T>) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientPrismaConnectionError(error) || attempt === maxAttempts) {
        throw error;
      }

      console.warn("Retrying database operation after transient Prisma connection error.", error);
      await prisma.$disconnect();
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  return operation();
}
