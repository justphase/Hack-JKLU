import IORedis from "ioredis";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times: number) {
        if (times > 3) {
          console.error("❌ Redis connection failed after 3 retries");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    connection.on("connect", () => {
      console.log("✅ Redis connected");
    });

    connection.on("error", (err: Error) => {
      console.error("❌ Redis error:", err.message);
    });
  }
  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
