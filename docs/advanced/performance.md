---
title: "Performance"
---

# Performance Optimization in Fastay

Fastay applications, like any Node.js web service, can benefit from performance optimizations that improve response times, increase throughput, and reduce resource consumption. While Fastay provides a solid foundation, understanding where and how to optimize can make the difference between a responsive API and one that struggles under load.

## Understanding Fastay Performance Characteristics

Fastay builds on Express.js, inheriting its performance characteristics while adding its own routing and middleware systems. Key performance considerations include:

- **File-based routing overhead**: Automatic route discovery has minimal impact but occurs at startup
- **Middleware execution order**: Each middleware adds to request processing time
- **TypeScript compilation**: Development builds use ts-node; production runs compiled JavaScript
- **Request/response lifecycle**: Understanding where time is spent in each request

Performance optimization focuses on three areas: reducing latency for individual requests, increasing throughput for concurrent requests, and minimizing resource usage overall.

## Startup Performance

Fastay applications start quickly, but you can optimize startup time for better development experience and faster scaling:

### Lazy Loading Components

Consider lazy loading for non-essential components:

```typescript
// Instead of importing everything at startup
import { heavyModule } from "./heavy-module";

// Load only when needed
async function getHeavyModule() {
  const { heavyModule } = await import("./heavy-module");
  return heavyModule;
}
```

### Optimize Imports

Avoid unnecessary imports in your main application file:

```typescript
// src/index.ts
// Only import what's needed for startup
import { createApp } from "@syntay/fastay";

// Defer loading of services until routes need them
// Services will be imported when their corresponding routes are accessed
```

### Environment-Specific Startup

Skip development-only middleware in production:

```typescript
await createApp({
  apiDir: "./src/api",
  baseRoute: "/api",
  expressOptions: {
    middlewares: [
      // Development-only middleware
      ...(process.env.NODE_ENV === "development"
        ? [developmentLogger, hotReloadMiddleware]
        : []),
      // Production middleware
      helmet(),
      compression(),
    ],
  },
});
```

## Request Processing Optimization

### Middleware Optimization

Middleware executes for every matching request, so optimize critical path middleware:

```typescript
// src/middlewares/optimizedAuth.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function optimizedAuth(
  request: Request,
  response: Response,
  next: Next,
) {
  // Skip authentication for public routes early
  if (request.path.startsWith("/api/public/")) {
    return next();
  }

  // Use efficient token validation
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return response.status(401).end(); // Fast failure
  }

  // Extract token without string manipulation if possible
  const token = authHeader.slice(7); // "Bearer ".length

  // Fast token validation (consider JWT without full verification for some cases)
  if (token.length < 10) {
    // Quick sanity check
    return response.status(401).end();
  }

  // Use request caching for repeated tokens
  if (request.ip && token === request.cachedToken) {
    request.user = request.cachedUser;
    return next();
  }

  // Only then do expensive validation
  const user = await validateToken(token);
  request.user = user;
  request.cachedToken = token;
  request.cachedUser = user;

  next();
}
```

### Route Handler Optimization

Keep route handlers lean and delegate to services:

```typescript
// Fast: Minimal logic in route handler
export async function GET(request: Request) {
  const { page, limit } = request.query;
  const result = await userService.findUsers({
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  });
  return result;
}

// Slow: Business logic in route handler
export async function GET(request: Request) {
  const { page, limit } = request.query;
  const pageNum = page ? parseInt(page as string) : 1;
  const limitNum = limit ? parseInt(limit as string) : 20;
  const skip = (pageNum - 1) * limitNum;

  // Database query directly in route handler
  const users = await db.users.findMany({
    skip,
    take: limitNum,
    orderBy: { createdAt: "desc" },
  });

  const total = await db.users.count();

  return {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}
```

### Response Optimization

Optimize how you send responses:

```typescript
// Use appropriate status codes for faster client processing
export async function DELETE(request: Request) {
  await itemService.delete(request.params.id);
  return null; // 204 No Content - no body to serialize/transmit
}

// Stream large responses
export async function GET(request: Request) {
  const largeDataset = await dataService.getLargeDataset();

  // Instead of sending all at once
  // return largeDataset // Could cause memory issues

  // Stream the response
  return {
    stream: createReadableStream(largeDataset),
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  };
}
```

## Concurrency and Throughput

### Connection Pooling

Configure database connection pools appropriately:

```typescript
// src/lib/database.ts
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({
  // Connection pool settings
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Adjust based on your database and infrastructure
  // Defaults are usually good starting points
});

// For raw database drivers, configure pool size
import { Pool } from "pg";

export const pool = new Pool({
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Worker Threads for CPU-Intensive Tasks

Offload CPU-intensive work from the main event loop:

```typescript
// src/utils/worker.ts
import { Worker } from "worker_threads";

export function processWithWorker(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./dist/workers/processor.js", {
      workerData: data,
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// In your route handler
export async function POST(request: Request) {
  const data = await request.body;

  // Offload heavy processing
  const result = await processWithWorker(data);

  return { result };
}
```

## Caching Strategies

### Response Caching

Cache frequently accessed, expensive-to-compute responses:

```typescript
// src/middlewares/cache.ts
import { Request, Response, Next } from "@syntay/fastay";

const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

export function responseCache(keyGenerator?: (req: Request) => string) {
  return async function (request: Request, response: Response, next: Next) {
    if (request.method !== "GET") {
      return next();
    }

    const cacheKey = keyGenerator
      ? keyGenerator(request)
      : `${request.method}:${request.path}:${JSON.stringify(request.query)}`;

    const cached = cache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      // Set cache headers
      response.setHeader("X-Cache", "HIT");
      response.setHeader("Cache-Control", "public, max-age=60");

      return response.json(cached.data);
    }

    // Override response.json to cache the result
    const originalJson = response.json;
    response.json = function (data: any) {
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + CACHE_TTL,
      });

      // Clean old entries (basic cleanup)
      if (cache.size > 1000) {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
          if (now > entry.expiry) {
            cache.delete(key);
          }
        }
      }

      response.setHeader("X-Cache", "MISS");
      return originalJson.call(this, data);
    };

    next();
  };
}

// Usage for expensive API endpoints
export const middleware = createMiddleware({
  "/api/products": [responseCache()],
  "/api/reports": [responseCache((req) => `report:${req.user.id}`)],
});
```

### Database Query Caching

Cache database query results:

```typescript
// src/services/cached-user-service.ts
import { db } from "../lib/database";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export class CachedUserService {
  async getUserById(id: string) {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - query database
    const user = await db.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (user) {
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  }

  async invalidateUserCache(id: string) {
    await redis.del(`user:${id}`);
  }
}
```

## Memory Management

### Prevent Memory Leaks

Fastay applications can develop memory leaks if not careful:

```typescript
// ✗ Potential memory leak: Storing request references
const activeRequests = new Map();

export async function trackerMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  activeRequests.set(request.id, request); // This keeps requests in memory!

  response.on("finish", () => {
    activeRequests.delete(request.id); // Clean up
  });

  next();
}

// ✓ Better: Store minimal information
const requestMetrics = new Map();

export async function metricsMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  response.on("finish", () => {
    const duration = Date.now() - startTime;
    requestMetrics.set(request.id, { duration, path: request.path });

    // Auto-clean old metrics
    setTimeout(() => {
      requestMetrics.delete(request.id);
    }, 60000); // Keep for 1 minute only
  });

  next();
}
```

### Stream Processing for Large Payloads

Process large requests and responses as streams:

```typescript
// src/middlewares/streamProcessor.ts
import { Request, Response, Next } from "@syntay/fastay";
import { Transform } from "stream";

export function streamProcessor() {
  return async function (request: Request, response: Response, next: Next) {
    const contentType = request.get("content-type");

    if (
      contentType?.includes("application/json") &&
      parseInt(request.get("content-length") || "0") > 1024 * 1024
    ) {
      // > 1MB

      // Process as stream instead of loading entire body
      let body = "";

      request.on("data", (chunk) => {
        body += chunk.toString();
        // Process in chunks if needed
      });

      request.on("end", () => {
        try {
          request.body = JSON.parse(body);
          next();
        } catch (error) {
          response.status(400).json({ error: "Invalid JSON" });
        }
      });

      return; // Don't call next() here - waiting for stream end
    }

    // For normal-sized requests, proceed normally
    next();
  };
}
```

## Monitoring and Profiling

### Performance Metrics Collection

Collect metrics to identify bottlenecks:

```typescript
// src/middlewares/metrics.ts
import { Request, Response, Next } from "@syntay/fastay";

const metrics = {
  requestCount: 0,
  totalResponseTime: 0,
  byEndpoint: new Map(),
};

export async function metricsMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();
  const endpoint = `${request.method} ${request.path}`;

  response.on("finish", () => {
    const duration = Date.now() - startTime;

    metrics.requestCount++;
    metrics.totalResponseTime += duration;

    const endpointStats = metrics.byEndpoint.get(endpoint) || {
      count: 0,
      totalTime: 0,
      maxTime: 0,
      minTime: Infinity,
    };

    endpointStats.count++;
    endpointStats.totalTime += duration;
    endpointStats.maxTime = Math.max(endpointStats.maxTime, duration);
    endpointStats.minTime = Math.min(endpointStats.minTime, duration);

    metrics.byEndpoint.set(endpoint, endpointStats);

    // Log slow requests
    if (duration > 1000) {
      // > 1 second
      console.warn(`Slow request: ${endpoint} took ${duration}ms`);
    }
  });

  next();
}

// Export metrics for monitoring
export function getMetrics() {
  const avgResponseTime =
    metrics.requestCount > 0
      ? metrics.totalResponseTime / metrics.requestCount
      : 0;

  return {
    requestCount: metrics.requestCount,
    avgResponseTime,
    endpoints: Object.fromEntries(metrics.byEndpoint.entries()),
  };
}
```

### Profiling in Production

Use Node.js built-in profiler or third-party tools:

```bash
# Start Fastay with profiling
node --prof dist/index.js

# After running under load, generate profile
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > profile.txt
```

## Load Testing and Benchmarking

### Load Testing Setup

Test your Fastay application under load:

```typescript
// scripts/load-test.js
import autocannon from "autocannon";
import { createApp } from "@syntay/fastay";

async function runLoadTest() {
  const app = await createApp({
    apiDir: "./src/api",
    baseRoute: "/api",
    port: 0,
    mode: "test",
  });

  const port = app.server.address().port;

  const result = await autocannon({
    url: `http://localhost:${port}`,
    connections: 100, // Concurrent connections
    duration: 30, // Test duration in seconds
    requests: [
      {
        method: "GET",
        path: "/api/users",
      },
      {
        method: "POST",
        path: "/api/users",
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
        }),
      },
    ],
  });

  console.log("Load test results:", {
    requestsPerSecond: result.requests.average,
    latency: result.latency.average,
    throughput: result.throughput.average,
  });

  app.server.close();
}

runLoadTest().catch(console.error);
```

## Production Performance Checklist

Before deploying to production, verify:

- [ ] **NODE_ENV=production** is set
- [ ] Application runs from compiled JavaScript (`dist/`)
- [ ] Database connection pooling is configured
- [ ] Response compression is enabled
- [ ] Appropriate cache headers are set
- [ ] Rate limiting is in place for public endpoints
- [ ] Monitoring and alerting are configured
- [ ] Logging is structured and not synchronous
- [ ] Memory usage is monitored
- [ ] Process manager (PM2, systemd) handles restarts

## Trade-offs and Considerations

Performance optimization involves trade-offs:

- **Caching** improves speed but adds complexity and can serve stale data
- **Connection pooling** helps throughput but consumes resources
- **Streaming** reduces memory usage but complicates error handling
- **Worker threads** offload CPU work but add inter-process communication overhead

Optimize based on your specific requirements. A high-throughput API might prioritize different optimizations than a low-latency real-time service.

> _Fastay builds on Node.js and Express.js, but its architecture removes many of the inefficiencies commonly found in traditional Express applications. By enforcing deterministic routing, predictable middleware execution, and a strict separation of concerns, Fastay reduces overhead and avoids common performance pitfalls present in ad-hoc Express setups.Combined with efficient middleware design, optimized database access, and appropriate caching strategies, Fastay enables consistently high performance within the Node.js ecosystem. As always, profiling should guide optimization efforts to focus on real bottlenecks rather than assumptions._
