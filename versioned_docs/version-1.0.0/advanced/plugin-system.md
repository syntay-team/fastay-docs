---
title: "Plugin System"
---

# Extending Fastay Applications

Fastay does not include a formal plugin system or registry. Instead, it provides patterns and conventions that allow developers to build reusable extensions using Fastay's existing primitives: middleware, configuration, and service modules. This approach keeps extensions explicit, maintainable, and closely aligned with Node.js and Express.js patterns.

## Understanding Fastay's Extension Philosophy

Fastay favors composition over complex plugin infrastructure. Extensions are built using the same tools you use for regular application development:

- **Middleware functions** for request/response processing
- **Configuration objects** for behavior customization
- **Service classes** for shared business logic
- **Route handlers** for adding API endpoints

This approach means there's no special plugin API to learn. Instead, you use Fastay's existing patterns to create reusable components that can be shared across projects or teams.

## Creating Reusable Middleware Extensions

Middleware is Fastay's primary extension mechanism. You can create configurable middleware functions that work like plugins:

```typescript
// extensions/request-id.ts
import { Request, Response, Next } from "@syntay/fastay";

export interface RequestIdOptions {
  headerName?: string;
}

export function requestIdExtension(options: RequestIdOptions = {}) {
  const { headerName = "X-Request-ID" } = options;

  return async function requestIdMiddleware(
    request: Request,
    response: Response,
    next: Next,
  ) {
    // Generate or extract request ID
    const requestId =
      request.headers[headerName.toLowerCase()] || crypto.randomUUID();

    // Attach to request for use in other middleware and routes
    request.requestId = requestId;

    // Add to response headers
    response.setHeader(headerName, requestId);

    next();
  };
}

// Export with sensible defaults
export const requestId = requestIdExtension();
```

This pattern creates a reusable middleware extension that can be configured differently in each application. Usage is straightforward:

```typescript
// In your middleware.ts
import { requestId } from "../extensions/request-id";

export const middleware = createMiddleware({
  "/api": [requestId({ headerName: "X-Correlation-ID" })],
  // ... other middleware
});
```

## Building Configuration-Driven Extensions

Some extensions need configuration that affects how they work. Create extensions that accept configuration options:

```typescript
// extensions/rate-limiter.ts
import { Request, Response, Next } from "@syntay/fastay";

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function rateLimiterExtension(options: RateLimiterOptions) {
  const requestCounts = new Map<string, number>();

  return async function rateLimitMiddleware(
    request: Request,
    response: Response,
    next: Next,
  ) {
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();

    // Simple in-memory rate limiting
    // For production, use Redis or another shared store
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [storedKey, timestamp] of requestCounts.entries()) {
      if (timestamp < windowStart) {
        requestCounts.delete(storedKey);
      }
    }

    // Count requests in current window
    const count = (requestCounts.get(key) || 0) + 1;
    requestCounts.set(key, now);

    if (count > options.maxRequests) {
      return response.status(429).json({
        error: options.message || "Too many requests",
      });
    }

    next();
  };
}
```

## Adding Routes as Extensions

Sometimes extensions need to add their own API routes. Since Fastay exposes the underlying Express application, you can add routes programmatically:

```typescript
// extensions/health-check.ts
import { createApp } from "@syntay/fastay";

export function healthCheckExtension(options?: {
  path?: string;
  includeDetails?: boolean;
}) {
  const { path = "/health", includeDetails = false } = options || {};

  return {
    // This function can be called after createApp
    setup: (expressApp: any) => {
      expressApp.get(path, async (req: any, res: any) => {
        const healthInfo = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };

        if (includeDetails) {
          Object.assign(healthInfo, {
            memory: process.memoryUsage(),
            version: process.env.npm_package_version,
          });
        }

        res.json(healthInfo);
      });
    },
  };
}
```

To use this extension:

```typescript
// In your main application file
import { createApp } from "@syntay/fastay";
import { healthCheckExtension } from "./extensions/health-check";

void (async () => {
  const app = await createApp({
    // ... your Fastay configuration
  });

  // Add health check routes to the Express app
  const healthCheck = healthCheckExtension({ includeDetails: true });
  healthCheck.setup(app.expressApp);
})();
```

## Creating Service-Based Extensions

Extensions can also provide reusable services that encapsulate business logic:

```typescript
// extensions/email-service.ts
export interface EmailServiceOptions {
  fromEmail: string;
  provider?: "smtp" | "sendgrid";
}

export class EmailService {
  constructor(private options: EmailServiceOptions) {}

  async sendWelcomeEmail(to: string, name: string) {
    // Implementation depends on email provider
    // This is a simplified example
    console.log(`Sending welcome email to ${to}`);

    // In a real implementation, you would:
    // 1. Validate inputs
    // 2. Format the email
    // 3. Send via chosen provider
    // 4. Handle errors
  }

  async sendPasswordReset(to: string, resetToken: string) {
    console.log(`Sending password reset to ${to}`);
    // Implementation...
  }
}
```

Services are typically instantiated and made available to your application:

```typescript
// In your application setup
import { EmailService } from "./extensions/email-service";

// Create service instance
const emailService = new EmailService({
  fromEmail: "noreply@example.com",
  provider: "sendgrid",
});

// Use in your routes
export async function POST(request: Request) {
  const userData = await request.body;

  // Use the email service
  await emailService.sendWelcomeEmail(userData.email, userData.name);

  return { message: "User created" };
}
```

## Composing Multiple Extensions

Extensions work best when they're independent and composable. Instead of building complex plugin managers, simply import and use what you need:

```typescript
// In your main application configuration
import { requestId } from "./extensions/request-id";
import { rateLimiterExtension } from "./extensions/rate-limiter";
import { EmailService } from "./extensions/email-service";

// Configure extensions
const rateLimiter = rateLimiterExtension({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

const emailService = new EmailService({
  fromEmail: "noreply@example.com",
});

// Use in Fastay configuration
export const middleware = createMiddleware({
  "/api/auth": [
    requestId(),
    rateLimiter, // Apply rate limiting to auth endpoints
  ],
  "/api/public": [
    requestId(),
    // No rate limiting for public endpoints
  ],
});

// Email service is available for use in route handlers
export { emailService };
```

This explicit composition is easier to understand and debug than hidden plugin lifecycles.

## When to Create Extensions

Create reusable extensions when:

1. **Functionality is needed across multiple projects** - Authentication, logging, or payment processing
2. **Complex configuration is required** - Rate limiting with different rules per endpoint
3. **Third-party integrations need abstraction** - Email, SMS, or file storage services
4. **Common patterns emerge** - Request validation, error formatting, or response caching

Avoid creating extensions for:

- Project-specific business logic
- Simple one-off utilities
- Features that might not be reused

## Best Practices for Fastay Extensions

### Keep Extensions Focused

Each extension should do one thing well. A rate limiter extension shouldn't also handle authentication. This keeps extensions reusable and easier to test.

### Use TypeScript Effectively

Export proper types and interfaces so other developers understand how to use your extension:

```typescript
export interface ExtensionOptions {
  // Document each option
  enabled?: boolean;
  timeout?: number;
}

export function createExtension(options: ExtensionOptions = {}) {
  // Implementation...
}
```

### Provide Sensible Defaults

Make extensions easy to use by providing good defaults:

```typescript
// Good: Provides defaults
export function loggingExtension(options: { level?: string } = {}) {
  const level = options.level || "info";
  // ...
}

// Less convenient: Requires configuration
export function loggingExtension(options: { level: string }) {
  // User must always specify level
}
```

### Document Dependencies Clearly

If your extension depends on other packages, document them clearly:

```typescript
// In your extension's README or JSDoc:
/**
 * Email Service Extension
 *
 * Requires: nodemailer or @sendgrid/mail
 * Install: npm install nodemailer
 */
```

### Test Extensions Independently

Test extensions without requiring a full Fastay application:

```typescript
// Test the middleware function directly
import { requestIdExtension } from "./extensions/request-id";

test("adds request ID header", async () => {
  const middleware = requestIdExtension();
  const mockRequest = { headers: {} };
  const mockResponse = { setHeader: jest.fn() };

  await middleware(mockRequest, mockResponse, () => {});

  expect(mockResponse.setHeader).toHaveBeenCalledWith(
    "X-Request-ID",
    expect.any(String),
  );
});
```

## Extension Distribution Patterns

While Fastay doesn't have a plugin registry, you can share extensions through:

### npm Packages

Package extensions as standalone npm packages:

```json
{
  "name": "fastay-request-id",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@syntay/fastay": "^1.0.0"
  }
}
```

### Internal Monorepos

For organization-specific extensions, use a monorepo structure:

```
extensions/
├── request-id/
├── rate-limiter/
├── email-service/
└── package.json
```

### Shared Code Repositories

Simply copy extension code between projects when starting out. This avoids package management overhead for small teams.

## Limitations and Considerations

Fastay's extension patterns have some intentional limitations:

### No Automatic Discovery

Extensions must be explicitly imported and configured. This makes dependencies clear but requires manual setup.

### No Dependency Management

Extensions don't automatically manage their dependencies. You must ensure required packages are installed.

### No Lifecycle Hooks

Unlike some frameworks, Fastay doesn't provide extension lifecycle hooks. Extensions run when they're called, typically during request processing or application startup.

### No Configuration Merging

Each application configures extensions separately. There's no global configuration that extensions automatically read.

These limitations are by design. They keep Fastay applications simple and make extension behavior explicit rather than magical.

## Moving Beyond Simple Extensions

For very large applications, you might need more structure. In these cases, consider:

### Factory Functions

Create factories that wire up multiple extensions:

```typescript
export function createMonitoringExtensions() {
  return {
    requestId: requestIdExtension(),
    metrics: metricsExtension(),
    logging: loggingExtension(),
  };
}
```

### Configuration Objects

Use configuration objects to manage complex extension setups:

```typescript
const extensionsConfig = {
  monitoring: {
    enabled: true,
    requestId: { headerName: "X-Request-ID" },
    metrics: { endpoint: "/metrics" },
  },
  security: {
    rateLimiting: { enabled: true, maxRequests: 100 },
  },
};
```

### Dependency Injection Containers

For advanced cases, use a lightweight DI container:

```typescript
import { createContainer } from "awilix";

const container = createContainer();

container.register({
  emailService: asValue(
    new EmailService({
      /* config */
    }),
  ),
  logger: asValue(createLogger()),
  requestId: asFunction(() => requestIdExtension()),
});
```

However, most Fastay applications don't need this complexity. Start with simple imports and only add structure when you have clear pain points.

## Conclusion

Fastay's approach to extensions is pragmatic rather than prescriptive. By using the same patterns you already know—middleware functions, configuration objects, and service classes—you can create reusable components that work across projects without learning a special plugin API.

This simplicity comes with trade-offs: you have to wire up extensions manually, and there's no magic discovery or lifecycle management. But for most applications, this explicit approach leads to more maintainable, understandable code.

Extensions in Fastay are ultimately just well-structured Node.js modules that happen to work well with Fastay's conventions. By keeping them simple, focused, and composable, you can build a library of reusable components that make your Fastay development more efficient without introducing unnecessary framework complexity.
