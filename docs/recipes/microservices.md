---
title: "Microservices"
---

# Microservices with Fastay

Fastay's lightweight, focused architecture makes it well-suited for building microservices. Each Fastay application can serve as an independent service in a larger distributed system, while still benefiting from Fastay's developer-friendly conventions and TypeScript support.

## Understanding Fastay in a Microservices Context

When using Fastay for microservices, each service is a standalone Fastay application with its own:

- **API endpoints** defined through file-based routing
- **Database connection** (if needed)
- **Business logic** in services
- **Configuration** and environment variables
- **Deployment process**

The microservices communicate with each other via HTTP/REST, gRPC, or message queues, with Fastay handling the HTTP layer for each service.

## Recommended Architecture Pattern

### Service Boundaries

Define clear boundaries for each Fastay-based microservice:

<div class="fastay-overview">
  <img 
    src="/img/fastay-microservices.png" 
    alt="Arquiteture Fastay" 
  />
</div>

### Service Template Structure

Create a reusable template for Fastay microservices:

```
fastay-service-template/
├── src/
│   ├── api/
│   │   └── [resource]/
│   │       └── route.ts
│   ├── services/
│   │   └── [service].ts
│   ├── lib/
│   │   ├── database.ts
│   │   └── messaging.ts
│   └── index.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Communication Between Services

### HTTP Communication (REST)

Services communicate via HTTP requests. Use a shared HTTP client with retry logic:

```typescript
// src/lib/http-client.ts
import axios from "axios";

export class ServiceClient {
  private client: ReturnType<typeof axios.create>;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "fastay-microservice",
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Implement retry logic for network errors
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          // Retry logic here
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(path: string, config?: any): Promise<T> {
    const response = await this.client.get(path, config);
    return response.data;
  }

  async post<T>(path: string, data: any, config?: any): Promise<T> {
    const response = await this.client.post(path, data, config);
    return response.data;
  }

  // Add other HTTP methods as needed
}

// Service-specific clients
export const userServiceClient = new ServiceClient(
  process.env.USER_SERVICE_URL || "http://user-service:3000",
);

export const orderServiceClient = new ServiceClient(
  process.env.ORDER_SERVICE_URL || "http://order-service:3001",
);
```

### Using HTTP Clients in Services

```typescript
// src/services/order-service.ts
import { userServiceClient } from "../lib/http-client";

export class OrderService {
  async createOrder(userId: string, items: any[]) {
    // Call user service to verify user exists
    try {
      const user = await userServiceClient.get(`/api/users/${userId}`);

      // Process order with validated user
      const order = {
        userId: user.id,
        items,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Save to database
      return db.orders.create({ data: order });
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`User ${userId} not found`);
      }
      throw error;
    }
  }
}
```

## API Gateway Pattern

### Fastay as an API Gateway

Use Fastay as an API gateway to route requests to appropriate services:

```typescript
// Gateway service: src/api/[service]/route.ts
import { Request } from "@syntay/fastay";
import { userServiceClient, orderServiceClient } from "../../lib/http-client";

// Route /api/users/* to user service
export async function GET(request: Request) {
  const path = request.path.replace("/api/users", "");

  try {
    const data = await userServiceClient.get(path, {
      headers: request.headers,
    });
    return data;
  } catch (error) {
    // Propagate status code and error from downstream service
    return {
      status: error.response?.status || 500,
      body: error.response?.data || { error: "Service unavailable" },
    };
  }
}

export async function POST(request: Request) {
  const path = request.path.replace("/api/users", "");
  const body = await request.body;

  try {
    const data = await userServiceClient.post(path, body, {
      headers: request.headers,
    });
    return {
      status: 201,
      body: data,
    };
  } catch (error) {
    return {
      status: error.response?.status || 500,
      body: error.response?.data || { error: "Service unavailable" },
    };
  }
}
```

### Request Forwarding with Headers

Preserve important headers when forwarding requests:

```typescript
function forwardRequest(serviceClient: ServiceClient, request: Request) {
  const path = request.path;
  const headers = {
    // Preserve authentication
    Authorization: request.headers.authorization,
    // Add correlation ID for tracing
    "X-Correlation-ID":
      request.headers["x-correlation-id"] || crypto.randomUUID(),
    // Add request ID
    "X-Request-ID": request.requestId,
    // Service mesh headers
    "X-Service-Version": process.env.SERVICE_VERSION,
  };

  return serviceClient.request({
    method: request.method,
    path,
    data: request.body,
    headers,
  });
}
```

## Service Discovery

### Simple Service Discovery

Implement basic service discovery for development:

```typescript
// src/lib/service-registry.ts
export class ServiceRegistry {
  private services: Map<string, string> = new Map();

  constructor() {
    // Default services for development
    this.services.set(
      "user-service",
      process.env.USER_SERVICE_URL || "http://localhost:3001",
    );
    this.services.set(
      "order-service",
      process.env.ORDER_SERVICE_URL || "http://localhost:3002",
    );
    this.services.set(
      "payment-service",
      process.env.PAYMENT_SERVICE_URL || "http://localhost:3003",
    );
  }

  getServiceUrl(serviceName: string): string {
    const url = this.services.get(serviceName);
    if (!url) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }
    return url;
  }

  // For dynamic discovery (e.g., from environment or config server)
  async discoverServices() {
    // Could fetch from config server, Kubernetes API, etc.
  }
}

export const serviceRegistry = new ServiceRegistry();
```

### Using Service Discovery

```typescript
// src/lib/http-client.ts
import { serviceRegistry } from "./service-registry";

export function createServiceClient(serviceName: string) {
  const baseURL = serviceRegistry.getServiceUrl(serviceName);
  return new ServiceClient(baseURL);
}

// Usage
const userService = createServiceClient("user-service");
const orderService = createServiceClient("order-service");
```

## Shared Configuration

### Configuration Management

Share configuration across services:

```typescript
// src/config/shared.ts
export interface ServiceConfig {
  name: string;
  version: string;
  port: number;
  database?: {
    url: string;
    poolSize?: number;
  };
  redis?: {
    url: string;
  };
  services: {
    [key: string]: string;
  };
}

// Load configuration from environment with defaults
export function loadConfig(): ServiceConfig {
  return {
    name: process.env.SERVICE_NAME || "unknown-service",
    version: process.env.SERVICE_VERSION || "1.0.0",
    port: parseInt(process.env.PORT || "3000"),
    database: process.env.DATABASE_URL
      ? {
          url: process.env.DATABASE_URL,
          poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
        }
      : undefined,
    services: {
      "user-service": process.env.USER_SERVICE_URL || "http://localhost:3001",
      "order-service": process.env.ORDER_SERVICE_URL || "http://localhost:3002",
    },
  };
}
```

## Database Per Service

### Isolated Databases

Each service manages its own database:

```typescript
// User service database schema (Prisma)
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Order service database schema
model Order {
  id        String   @id @default(cuid())
  userId    String   // References user in user service
  items     Json
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Sharing Data Without Shared Database

Use API calls to share data between services:

```typescript
// In order service
async function getOrderWithUserDetails(orderId: string) {
  const order = await db.orders.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Call user service for user details
  const user = await userServiceClient.get(`/api/users/${order.userId}`);

  return {
    ...order,
    user,
  };
}
```

## Event-Driven Communication

### Publishing Events

Publish events when important actions occur:

```typescript
// src/lib/event-bus.ts
import { Kafka } from "kafkajs";

export class EventBus {
  private producer: any;

  constructor() {
    const kafka = new Kafka({
      clientId: process.env.SERVICE_NAME,
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    });

    this.producer = kafka.producer();
  }

  async connect() {
    await this.producer.connect();
  }

  async publish(topic: string, event: any) {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            source: process.env.SERVICE_NAME,
          }),
        },
      ],
    });
  }
}

// Usage in service
export class UserService {
  constructor(private eventBus: EventBus) {}

  async createUser(data: any) {
    const user = await db.users.create({ data });

    // Publish event
    await this.eventBus.publish("user.created", {
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}
```

### Consuming Events

Consume events from other services:

```typescript
// In order service
async function startEventConsumer() {
  const kafka = new Kafka({
    clientId: "order-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });

  const consumer = kafka.consumer({ groupId: "order-service-group" });

  await consumer.connect();
  await consumer.subscribe({ topic: "user.created", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      // Handle user.created event
      if (event.type === "user.created") {
        // Create welcome order for new user
        await createWelcomeOrder(event.userId);
      }
    },
  });
}
```

## Health Checks and Monitoring

### Service Health Endpoints

Each service exposes health information:

```typescript
// src/api/health/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkEventBus(),
    checkDependencies(),
  ]);

  const results = checks.map((result, index) => {
    const checkNames = ["database", "event-bus", "dependencies"];
    return {
      name: checkNames[index],
      status: result.status === "fulfilled" && result.value,
      error: result.status === "rejected" ? result.reason.message : null,
    };
  });

  const allHealthy = results.every((r) => r.status);

  return {
    status: allHealthy ? 200 : 503,
    body: {
      service: process.env.SERVICE_NAME,
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION,
      checks: results,
    },
  };
}

async function checkDependencies() {
  // Check downstream services
  const services = ["user-service", "order-service", "payment-service"];

  const results = await Promise.allSettled(
    services.map((service) =>
      fetch(`${serviceRegistry.getServiceUrl(service)}/health`)
        .then((res) => res.ok)
        .catch(() => false),
    ),
  );

  return results.every(
    (result) => result.status === "fulfilled" && result.value,
  );
}
```

## Deployment Considerations

### Docker Configuration

Each service has its own Dockerfile:

```dockerfile
# Dockerfile for a Fastay microservice
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist/

# Generate Prisma client if using database
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.8"

services:
  user-service:
    build: ./user-service
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@user-db:5432/userdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - user-db
      - redis

  order-service:
    build: ./order-service
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@order-db:5432/orderdb
      - USER_SERVICE_URL=http://user-service:3000
    depends_on:
      - order-db
      - user-service

  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - USER_SERVICE_URL=http://user-service:3000
      - ORDER_SERVICE_URL=http://order-service:3000
    depends_on:
      - user-service
      - order-service

  user-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=userdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  order-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=orderdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
```

## Testing Microservices

### Contract Testing

Test API contracts between services:

```typescript
// tests/contract/user-service.contract.test.ts
import { describe, it, expect } from "vitest";
import { userServiceClient } from "../../src/lib/http-client";

describe("User Service Contract", () => {
  it("should respond to health check", async () => {
    const response = await userServiceClient.get("/health");
    expect(response.status).toBe("healthy");
  });

  it("should create and retrieve users", async () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
    };

    // Create user
    const created = await userServiceClient.post("/api/users", userData);
    expect(created.id).toBeDefined();
    expect(created.email).toBe(userData.email);

    // Retrieve user
    const retrieved = await userServiceClient.get(`/api/users/${created.id}`);
    expect(retrieved.id).toBe(created.id);
  });
});
```

### Integration Testing

Test service interactions:

```typescript
// tests/integration/order-user-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "@syntay/fastay";
import { userServiceClient } from "../../src/lib/http-client";

describe("Order-User Service Integration", () => {
  let orderServiceApp: any;

  beforeAll(async () => {
    // Start order service
    orderServiceApp = await createApp({
      port: 0,
      apiDir: "./src/api",
      mode: "test",
    });
  });

  afterAll(async () => {
    await orderServiceApp.server.close();
  });

  it("should create order for valid user", async () => {
    // First create a user via user service
    const user = await userServiceClient.post("/api/users", {
      name: "Integration Test User",
      email: "integration@test.com",
    });

    // Then create order via order service
    const orderResponse = await fetch(
      `http://localhost:${orderServiceApp.port}/api/orders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          items: [{ productId: "123", quantity: 2 }],
        }),
      },
    );

    const order = await orderResponse.json();

    expect(orderResponse.status).toBe(201);
    expect(order.userId).toBe(user.id);
    expect(order.status).toBe("pending");
  });
});
```

## Resilience Patterns

### Circuit Breaker

Implement circuit breaker pattern for service calls:

```typescript
// src/lib/circuit-breaker.ts
export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const now = Date.now();

      // Check if we should try again
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime > this.resetTimeout
      ) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();

      // Success - reset if half-open
      if (this.state === "HALF_OPEN") {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  private reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}

// Usage
const userServiceBreaker = new CircuitBreaker();

async function getUserWithBreaker(userId: string) {
  return userServiceBreaker.execute(() =>
    userServiceClient.get(`/api/users/${userId}`),
  );
}
```

### Retry with Exponential Backoff

```typescript
// src/lib/retry.ts
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        break;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Logging and Tracing Across Services

### Distributed Tracing

Implement tracing across service boundaries:

```typescript
// src/middlewares/tracing.ts
import { Request, Response, Next } from "@syntay/fastay";

export function tracingMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  // Extract or generate trace ID
  const traceId = request.headers["x-trace-id"] || crypto.randomUUID();
  const spanId = crypto.randomUUID();

  // Store on request
  request.traceContext = {
    traceId,
    spanId,
    parentSpanId: request.headers["x-parent-span-id"],
  };

  // Add to response
  response.setHeader("X-Trace-ID", traceId);
  response.setHeader("X-Span-ID", spanId);

  // Propagate to downstream services
  request.traceHeaders = {
    "X-Trace-ID": traceId,
    "X-Span-ID": spanId,
    "X-Parent-Span-ID": spanId,
  };

  // Log with trace context
  request.logger = logger.child({ traceId, spanId });

  next();
}

// Use in HTTP client
export class ServiceClient {
  async get(path: string, config?: any) {
    const headers = {
      ...config?.headers,
      ...this.traceHeaders, // Add trace headers from request
    };

    return this.client.get(path, { ...config, headers });
  }
}
```

## Best Practices for Fastay Microservices

1. **Define Clear Boundaries**: Each service should have a single, well-defined responsibility.

2. **Use Asynchronous Communication**: Prefer event-driven communication over synchronous HTTP calls where appropriate.

3. **Implement Idempotency**: Make operations idempotent to handle retries safely.

4. **Version Your APIs**: Use versioning in your API routes to handle breaking changes.

5. **Monitor Dependencies**: Track health and performance of downstream services.

6. **Implement Graceful Degradation**: Services should continue functioning when dependencies are unavailable.

7. **Use Correlation IDs**: Pass correlation IDs through all service calls for tracing.

8. **Test Service Interactions**: Write contract and integration tests for service boundaries.

9. **Deploy Independently**: Each service should be deployable independently of others.

10. **Document Dependencies**: Clearly document service dependencies and contracts.

Fastay's simplicity and focus make it an excellent choice for microservices. Each service remains lightweight and focused, while still benefiting from Fastay's productivity features like file-based routing and TypeScript support. By following these patterns, you can build a scalable, maintainable microservices architecture with Fastay.
