---
title: "Custom Middleware"
---

# Custom Middleware in Fastay

Middleware is the backbone of request processing in Fastay, allowing you to intercept, transform, and enrich HTTP requests before they reach your route handlers. While Fastay provides built-in middleware capabilities, creating custom middleware gives you precise control over request flow, cross-cutting concerns, and application behavior.

## Understanding Fastay Middleware

Middleware in Fastay are asynchronous functions that sit between the client request and your route handlers. They receive three parameters: the request object, the response object, and a next function that passes control to the next middleware or route handler.

Fastay middleware differs from raw Express.js middleware in several key ways:

- **TypeScript integration**: Full type safety with Fastay's Request and Response interfaces
- **File-based organization**: Middleware lives in `src/middlewares/` with clear separation
- **Explicit registration**: Middleware is mapped to specific routes in `middleware.ts`
- **Consistent patterns**: Standardized async function signature across all middleware

## When to Create Custom Middleware

Create custom middleware when you need to:

- **Authenticate** users before allowing access to protected routes
- **Validate** request data before processing
- **Log** requests for debugging or monitoring
- **Transform** requests or responses in a standardized way
- **Rate limit** API endpoints to prevent abuse
- **Add context** to requests for downstream use (user data, request IDs, etc.)

Middleware is ideal for cross-cutting concerns that affect multiple routes. If logic is specific to a single route, consider keeping it in the route handler or a dedicated service.

## Middleware Structure and Lifecycle

Every Fastay middleware follows this structure:

```typescript
// src/middlewares/example.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function exampleMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  // 1. Pre-processing logic (runs before route handler)
  console.log(`Request received: ${request.method} ${request.path}`);

  // 2. Optional: Modify the request
  request.requestTimestamp = Date.now();

  // 3. Decide whether to continue or stop
  const shouldContinue = await checkSomeCondition(request);

  if (shouldContinue) {
    next(); // Pass to next middleware or route handler
  } else {
    // End the request-response cycle
    response.status(403).json({ error: "Access denied" });
  }

  // 4. Post-processing logic (runs after route handler completes)
  // Note: This only executes if next() was called
}
```

The middleware lifecycle follows a clear flow:

1. Request enters the middleware chain
2. Each middleware executes in order
3. Middleware can modify request/response objects
4. Middleware decides whether to continue or stop
5. If `next()` is called, control passes forward
6. If a response is sent, the chain stops
7. After the route handler, middleware can further process the response

## Practical Middleware Examples

### Authentication Middleware

Authentication is the most common use case for middleware:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function authMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({
      error: "Unauthorized",
      message: "No authentication token provided",
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const decoded = verifyJwtToken(token);

    // Attach user to request for use in route handlers
    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return response.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}
```

### Request Logging Middleware

Logging middleware captures request details for monitoring and debugging:

```typescript
// src/middlewares/logger.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function requestLogger(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  // Generate a unique request ID for tracking
  request.requestId = crypto.randomUUID();

  // Log the incoming request
  console.log({
    level: "info",
    type: "request_start",
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    ip: request.ip,
    userAgent: request.get("user-agent"),
    timestamp: new Date().toISOString(),
  });

  // Hook into response completion
  response.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log({
      level: "info",
      type: "request_complete",
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}
```

### Request Validation Middleware

Validate incoming data before it reaches your route handlers:

```typescript
// src/middlewares/validate.ts
import { Request, Response, Next } from "@syntay/fastay";
import { z } from "zod";

// Factory function that creates validation middleware for any schema
export function validate(schema: z.ZodSchema) {
  return async function (request: Request, response: Response, next: Next) {
    try {
      const validatedData = schema.parse(await request.body);

      // Store validated data on the request
      request.validatedData = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }

      // Pass other errors to the error handler
      next(error);
    }
  };
}

// Specific validation middleware
const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional(),
});

export const validateUser = validate(userSchema);
```

## Conditional Middleware Execution

Sometimes middleware should only run under specific conditions. Create conditional middleware that adapts to request context:

```typescript
// src/middlewares/conditional.ts
import { Request, Response, Next } from "@syntay/fastay";

export function conditionalMiddleware(
  condition: (req: Request) => boolean,
  middleware: Function,
) {
  return async function (request: Request, response: Response, next: Next) {
    if (condition(request)) {
      return middleware(request, response, next);
    }

    // Skip this middleware if condition isn't met
    next();
  };
}

// Usage: Only run admin check for /admin routes
export const adminCheck = conditionalMiddleware(
  (req) => req.path.startsWith("/admin"),
  async (request: Request, response: Response, next: Next) => {
    if (request.user?.role !== "admin") {
      return response.status(403).json({ error: "Admin access required" });
    }
    next();
  },
);
```

## Middleware Composition

Compose multiple middleware functions into a single unit for cleaner route configuration:

```typescript
// src/middlewares/compose.ts
import { Request, Response, Next } from "@syntay/fastay";

export function composeMiddlewares(...middlewares: Function[]) {
  return async function (request: Request, response: Response, next: Next) {
    // Create an iterator through the middleware chain
    async function runMiddleware(index: number) {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];

      // Call the middleware with a next function that runs the next middleware
      return middleware(request, response, () => runMiddleware(index + 1));
    }

    return runMiddleware(0);
  };
}

// Usage: Combine auth, logging, and validation
export const secureUserRoute = composeMiddlewares(
  authMiddleware,
  requestLogger,
  validateUser,
);
```

This pattern is especially useful when you have middleware sequences that are reused across multiple routes.

## Error-Handling Middleware

Error-handling middleware has a different signature—it accepts four parameters, with the error as the first argument:

```typescript
// src/middlewares/errorHandler.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  next: Next,
) {
  console.error("Middleware error:", {
    message: error.message,
    stack: error.stack,
    path: request.path,
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (error.name === "ValidationError") {
    return response.status(400).json({
      error: "Validation failed",
      message: error.message,
    });
  }

  if (error.name === "AuthenticationError") {
    return response.status(401).json({
      error: "Authentication required",
      message: error.message,
    });
  }

  // Default error response
  const isProduction = process.env.NODE_ENV === "production";

  response.status(500).json({
    error: "Internal server error",
    ...(isProduction ? {} : { message: error.message }),
  });
}
```

Error-handling middleware should be registered globally, not per-route:

```typescript
// In your main application configuration
await createApp({
  expressOptions: {
    errorHandler: errorHandler,
  },
});
```

## Middleware Registration and Configuration

Fastay middleware is registered in `src/middlewares/middleware.ts` using the `createMiddleware` function:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";
import { authMiddleware } from "./auth";
import { requestLogger } from "./logger";
import { validateUser } from "./validate";
import { rateLimiter } from "./rateLimit";

export const middleware = createMiddleware({
  // Apply to all routes
  "/api": [requestLogger],

  // Apply to specific routes
  "/api/users": [authMiddleware, validateUser],
  "/api/admin/": [authMiddleware, adminCheck],

  // Apply rate limiting to public endpoints
  "/api/auth/": [rateLimiter],
  "/api/public/": [rateLimiter],

  // No middleware for health checks
  "/health": [],
  "/api/health": [],
});
```

The order matters: middleware executes in the order it appears in the array, from first to last.

## Best Practices for Custom Middleware

1. **Keep middleware focused**: Each middleware should do one thing well. Combine concerns through composition, not monolithic middleware.

2. **Handle errors gracefully**: Always wrap async operations in try/catch blocks and pass errors to `next(error)`.

3. **Avoid side effects**: Middleware should be predictable and testable. Avoid global state or external dependencies when possible.

4. **Use factory functions**: Create middleware factories (like `validate(schema)`) for reusable patterns with different configurations.

5. **Consider performance**: Middleware adds overhead. Keep middleware lightweight, especially for high-traffic routes.

6. **Test thoroughly**: Middleware is critical infrastructure. Write tests for both success and failure cases.

7. **Document behavior**: Add comments or JSDoc explaining what your middleware does and any requirements or side effects.

8. **Version middleware carefully**: Changes to middleware can affect many routes. Consider backward compatibility when modifying existing middleware.

Custom middleware transforms Fastay from a simple routing framework into a powerful platform for building sophisticated APIs. By mastering [middleware](/core-concepts/middleware.md) patterns, you can create clean, maintainable applications that handle complex requirements with elegance and efficiency.
