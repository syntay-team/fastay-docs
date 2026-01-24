---
title: "Error Handling"
---

# Error Handling in Fastay

Error handling is a critical aspect of building reliable APIs. Fastay provides a comprehensive error handling system that helps you build robust applications with proper error management, clear error responses, and production-ready error reporting.

## Understanding Fastay's Error Handling Philosophy

Fastay treats error handling as a first-class concern. The framework provides multiple layers of error handling that work together to ensure your API gracefully handles unexpected situations while providing meaningful feedback to clients and developers.

### The Error Handling Pyramid

Fastay's error handling follows a hierarchical approach:

1. **Route-level error handling** - Local error management within individual routes
2. **Middleware error handling** - Error interception and transformation
3. **Global error handling** - Application-wide error management
4. **Development vs Production modes** - Different error details based on environment

This layered approach ensures errors are caught at the appropriate level and handled consistently throughout your application.

## Route-Level Error Handling

The most immediate place to handle errors is within your route handlers. Fastay makes this intuitive and flexible.

### Basic Try/Catch Pattern

The simplest and most common error handling pattern is using try/catch blocks within your route handlers:

```typescript
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  try {
    // Your business logic that might throw errors
    const data = await fetchDataFromDatabase();

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    // Handle the error
    console.error("Error fetching data:", error);

    return {
      status: 500,
      body: {
        error: "Failed to fetch data",
        message: "Please try again later",
      },
    };
  }
}
```

This pattern gives you complete control over error handling for each individual route. You can customize error responses based on the specific context of each endpoint.

### Conditional Error Handling

For APIs, you often need to return different error responses based on the type of failure:

```typescript
export async function GET(request: Request) {
  try {
    const { id } = request.params;

    // Input validation
    if (!id || isNaN(parseInt(id))) {
      return {
        status: 400,
        body: {
          error: "INVALID_INPUT",
          message: "ID must be a valid number",
        },
      };
    }

    const userId = parseInt(id);
    const user = await database.users.findUnique({
      where: { id: userId },
    });

    // Resource not found
    if (!user) {
      return {
        status: 404,
        body: {
          error: "USER_NOT_FOUND",
          message: `User with ID ${id} not found`,
        },
      };
    }

    // Authorization check
    if (user.role === "admin" && !request.user?.isAdmin) {
      return {
        status: 403,
        body: {
          error: "INSUFFICIENT_PERMISSIONS",
          message: "Admin access required",
        },
      };
    }

    return { user };
  } catch (error) {
    // Database-specific errors
    if (error.code === "P2025") {
      return {
        status: 404,
        body: { error: "RECORD_NOT_FOUND" },
      };
    }

    // Rate limiting errors
    if (error.message.includes("rate limit")) {
      return {
        status: 429,
        body: {
          error: "RATE_LIMIT_EXCEEDED",
          retryAfter: 60,
        },
      };
    }

    // Generic server error
    return {
      status: 500,
      body: {
        error: "INTERNAL_SERVER_ERROR",
        // Only include details in development
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      },
    };
  }
}
```

This approach provides clear, actionable error messages for clients while maintaining security by not exposing internal details in production.

## Custom Error Classes

For larger applications, creating custom error classes can significantly improve error handling consistency and maintainability.

### Creating Custom Error Classes

Custom error classes help standardize error responses across your application:

```typescript
// src/utils/errors.ts

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  // Serialize error for API response
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV === "development" && {
        stack: this.stack,
      }),
    };
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "AUTHENTICATION_REQUIRED", message);
  }
}

/**
 * Authorization error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "INSUFFICIENT_PERMISSIONS", message);
  }
}

/**
 * Resource not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" not found`
      : `${resource} not found`;

    super(404, "NOT_FOUND", message);
  }
}

/**
 * Conflict error (409 Conflict)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, "CONFLICT", message, details);
  }
}
```

### Using Custom Errors in Routes

Once you have custom error classes, you can use them throughout your application:

```typescript
import { Request } from "@syntay/fastay";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "../utils/errors";

export async function GET(request: Request) {
  const { id } = request.params;

  // Use custom errors for clear intent
  if (!id) {
    throw new ValidationError("User ID is required");
  }

  const user = await database.users.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new NotFoundError("User", id);
  }

  // Business rule validation
  if (user.status === "suspended") {
    throw new AuthorizationError("User account is suspended");
  }

  return { user };
}
```

Notice that we're using `throw` instead of returning error responses. This is because Fastay automatically catches thrown errors and converts them to appropriate HTTP responses.

## Global Error Handling

Fastay provides a global error handling mechanism that catches all unhandled errors and transforms them into consistent API responses.

### Configuring Global Error Handler

You can configure a global error handler through the `expressOptions` in your main application configuration:

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";

void (async () => {
  await createApp({
    port: 5000,
    apiDir: "./src/api",
    baseRoute: "/api",

    expressOptions: {
      errorHandler: (error, request, response, next) => {
        console.error("Global error handler caught:", {
          error: error.message,
          stack: error.stack,
          path: request.path,
          method: request.method,
          timestamp: new Date().toISOString(),
        });

        // Handle AppError instances
        if (error instanceof AppError) {
          return response.status(error.statusCode).json(error.toJSON());
        }

        // Handle Fastay-specific errors
        if (error.name === "FastayError") {
          return response.status(error.statusCode || 500).json({
            error: "FASTAY_ERROR",
            message: error.message,
          });
        }

        // Handle validation errors (e.g., from Zod)
        if (error.name === "ZodError") {
          return response.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: error.errors,
          });
        }

        // Default error response
        const isProduction = process.env.NODE_ENV === "production";

        response.status(500).json({
          error: "INTERNAL_SERVER_ERROR",
          message: isProduction
            ? "An unexpected error occurred"
            : error.message,
          ...(!isProduction && { stack: error.stack }),
        });
      },
    },
  });
})();
```

### Error Handler with Monitoring Integration

In production applications, you'll want to integrate with error monitoring services:

```typescript
// src/utils/errorHandler.ts
import { Request, Response, Next } from "@syntay/fastay";

export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  next: Next
) {
  // Log error details
  const errorDetails = {
    timestamp: new Date().toISOString(),
    path: request.path,
    method: request.method,
    userId: request.user?.id,
    userAgent: request.get("user-agent"),
    ip: request.ip,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestBody:
      process.env.NODE_ENV === "development" ? request.body : undefined,
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error details:", errorDetails);
  }

  // Send to error monitoring service (e.g., Sentry, LogRocket)
  if (process.env.ERROR_MONITORING_DSN) {
    sendToErrorMonitoring(errorDetails);
  }

  // Determine appropriate status code
  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred";

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Invalid request data";
  } else if (error.name === "UnauthorizedError") {
    statusCode = 401;
    errorCode = "UNAUTHORIZED";
    message = "Authentication required";
  }

  // Build response
  const responseBody: any = {
    error: errorCode,
    message: message,
    timestamp: new Date().toISOString(),
    requestId: request.requestId, // Set by request ID middleware
  };

  // Add details in non-production environments
  if (process.env.NODE_ENV !== "production") {
    responseBody.debug = {
      originalError: error.message,
      stack: error.stack?.split("\n").slice(0, 5), // First 5 lines of stack trace
    };
  }

  // Add validation error details
  if (error.name === "ZodError" || error.name === "ValidationError") {
    responseBody.details = error.errors || error.details;
  }

  response.status(statusCode).json(responseBody);
}
```

## Error Handling Middleware

Middleware can also participate in error handling, either by catching errors or by adding context to error responses.

### Error Context Middleware

This middleware adds request context to errors, making debugging easier:

```typescript
// src/middlewares/errorContext.ts
import { Request, Response, Next } from "@syntay/fastay";

export function errorContext(request: Request, response: Response, next: Next) {
  // Store original JSON method
  const originalJson = response.json;

  // Override json method to add context to error responses
  response.json = function (data: any) {
    // If this is an error response (status >= 400), add context
    if (response.statusCode >= 400 && data && typeof data === "object") {
      data = {
        ...data,
        context: {
          path: request.path,
          method: request.method,
          timestamp: new Date().toISOString(),
          requestId: request.requestId,
        },
      };
    }

    return originalJson.call(this, data);
  };

  next();
}
```

### Async Error Wrapper Middleware

For middleware that performs async operations, you need proper error handling:

```typescript
// src/middlewares/asyncHandler.ts
import { Request, Response, Next } from "@syntay/fastay";

/**
 * Wraps async middleware functions to ensure errors are caught
 * and passed to the error handling middleware
 */
export function asyncHandler(fn: Function) {
  return function (request: Request, response: Response, next: Next) {
    Promise.resolve(fn(request, response, next)).catch(next);
  };
}

// Usage example
export const authMiddleware = asyncHandler(async function (
  request: Request,
  response: Response,
  next: Next
) {
  const token = request.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new AuthenticationError("No authentication token provided");
  }

  try {
    const decoded = verifyJwtToken(token);
    request.user = await database.users.findUnique({
      where: { id: decoded.userId },
    });

    if (!request.user) {
      throw new AuthenticationError("User not found");
    }

    next();
  } catch (error) {
    // Re-throw as AuthenticationError for consistent handling
    throw new AuthenticationError("Invalid or expired token");
  }
});
```

## Validation Error Handling

Input validation is a common source of errors in APIs. Fastay works well with validation libraries like Zod to provide clear validation error messages.

### Zod Integration for Validation

```typescript
// src/utils/validation.ts
import { z } from "zod";

// Define validation schemas
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  email: z
    .string()
    .email("Invalid email address")
    .transform((email) => email.toLowerCase()),

  age: z
    .number()
    .min(0, "Age must be positive")
    .max(120, "Age must be realistic")
    .optional(),

  role: z.enum(["user", "admin", "moderator"]).default("user"),

  interests: z
    .array(z.string())
    .max(10, "Maximum 10 interests allowed")
    .optional(),
});

// Validation middleware
export function validate(schema: z.ZodSchema) {
  return async function (request: Request, response: Response, next: Next) {
    try {
      const validatedData = schema.parse(await request.body);

      // Store validated data on request for use in route handler
      request.validatedData = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into consistent format
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        // Pass to error handler
        next(
          new ValidationError("Request validation failed", validationErrors)
        );
      } else {
        next(error);
      }
    }
  };
}

// Usage in routes
import { validate } from "../utils/validation";
import { createUserSchema } from "../utils/validation";

export const validateUser = validate(createUserSchema);

// In middleware.ts
export const middleware = createMiddleware({
  "/api/users": [validateUser],
});
```

## Production vs Development Error Handling

Fastay encourages different error handling strategies for development and production environments.

### Environment-Based Error Responses

```typescript
// src/config/errorConfig.ts
export const errorConfig = {
  development: {
    // Show detailed error information
    showDetails: true,
    includeStack: true,
    logToConsole: true,
    logFormat: "detailed",

    // Response format
    responseFormat: (error: Error, request: Request) => ({
      error: error.name,
      message: error.message,
      stack: error.stack,
      path: request.path,
      method: request.method,
      timestamp: new Date().toISOString(),
    }),
  },

  production: {
    // Hide internal details
    showDetails: false,
    includeStack: false,
    logToConsole: false,
    logFormat: "json",

    // Send to external monitoring
    monitoringEnabled: true,

    // Response format
    responseFormat: (error: Error, request: Request) => ({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      referenceId: request.requestId, // For support tracking
      timestamp: new Date().toISOString(),
    }),
  },
};

// Usage in global error handler
export function productionErrorHandler(
  error: Error,
  request: Request,
  response: Response
) {
  const config =
    process.env.NODE_ENV === "production"
      ? errorConfig.production
      : errorConfig.development;

  // Log error (differently based on environment)
  if (config.logToConsole) {
    console.error(
      config.logFormat === "detailed"
        ? error
        : JSON.stringify({
            level: "error",
            message: error.message,
            name: error.name,
            path: request.path,
            timestamp: new Date().toISOString(),
          })
    );
  }

  // Send to monitoring service in production
  if (config.monitoringEnabled && process.env.SENTRY_DSN) {
    captureException(error, {
      extra: {
        path: request.path,
        method: request.method,
        userId: request.user?.id,
      },
    });
  }

  // Send response
  response
    .status(error.statusCode || 500)
    .json(config.responseFormat(error, request));
}
```

## Best Practices for Error Handling

### 1. Use Descriptive Error Codes

Instead of generic messages, use specific error codes that clients can programmatically handle:

```typescript
// ✗ Generic
return { error: "Invalid input" };

// ✓ Specific
return {
  status: 400,
  body: {
    error: "EMAIL_ALREADY_REGISTERED",
    message: "This email address is already in use",
    field: "email",
    suggestion: "Try a different email or reset your password",
  },
};
```

### 2. Include Error Metadata

Add metadata to help with debugging and monitoring:

```typescript
export function createErrorResponse(error: AppError, request: Request) {
  return {
    error: error.code,
    message: error.message,
    ...(error.details && { details: error.details }),
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
      path: request.path,
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          stack: error.stack?.split("\n").slice(0, 3),
        },
      }),
    },
  };
}
```

### 3. Handle Async Errors Properly

Always handle async operations with proper error handling:

```typescript
// ✗ Missing error handling
export async function GET() {
  const data = await fetchExternalApi(); // Unhandled promise rejection

  return { data };
}

// ✓ Proper error handling
export async function GET() {
  try {
    const data = await fetchExternalApi();
    return { data };
  } catch (error) {
    // Handle specific external API errors
    if (error.statusCode === 404) {
      throw new NotFoundError("External resource");
    }

    if (error.statusCode === 429) {
      throw new AppError(
        503,
        "EXTERNAL_SERVICE_UNAVAILABLE",
        "Service temporarily unavailable"
      );
    }

    throw error; // Let global error handler deal with it
  }
}
```

### 4. Log Appropriately Based on Environment

```typescript
function logError(error: Error, context: any) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Structured logging for production
    logger.error({
      message: error.message,
      errorCode: error.code,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });

    // Send to monitoring service
    if (process.env.SENTRY_DSN) {
      captureException(error, { extra: context });
    }
  } else {
    // Developer-friendly logging for development
    console.error("\n ERROR ==========================");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Context:", context);
    console.error("===================================\n");
  }
}
```

### 5. Create a Centralized Error Catalog

For large applications, maintain a centralized error catalog:

```typescript
// src/errors/catalog.ts
export const ErrorCatalog = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: {
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password",
      statusCode: 401,
    },
    TOKEN_EXPIRED: {
      code: "AUTH_TOKEN_EXPIRED",
      message: "Authentication token has expired",
      statusCode: 401,
    },
    INSUFFICIENT_PERMISSIONS: {
      code: "AUTH_INSUFFICIENT_PERMISSIONS",
      message: "You don't have permission to perform this action",
      statusCode: 403,
    },
  },

  // User errors
  USER: {
    NOT_FOUND: {
      code: "USER_NOT_FOUND",
      message: "User not found",
      statusCode: 404,
    },
    EMAIL_EXISTS: {
      code: "USER_EMAIL_EXISTS",
      message: "Email address is already registered",
      statusCode: 409,
    },
  },

  // Validation errors
  VALIDATION: {
    INVALID_EMAIL: {
      code: "VALIDATION_INVALID_EMAIL",
      message: "Invalid email address format",
      statusCode: 400,
      field: "email",
    },
    PASSWORD_TOO_WEAK: {
      code: "VALIDATION_PASSWORD_TOO_WEAK",
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and numbers",
      statusCode: 400,
      field: "password",
    },
  },
};

// Usage
throw new AppError(
  ErrorCatalog.AUTH.INVALID_CREDENTIALS.statusCode,
  ErrorCatalog.AUTH.INVALID_CREDENTIALS.code,
  ErrorCatalog.AUTH.INVALID_CREDENTIALS.message
);
```

## Common Error Handling Patterns

### Retry Logic with Exponential Backoff

For transient errors (like network issues or rate limits):

```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        error.statusCode === 429 || // Rate limit
        error.statusCode === 503 || // Service unavailable
        error.code === "ECONNRESET" || // Connection reset
        error.code === "ETIMEDOUT"; // Timeout

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      // Exponential backoff: wait longer between each retry
      const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
      );
    }
  }

  throw lastError;
}

// Usage
export async function GET() {
  try {
    const data = await withRetry(() => fetchExternalApi());
    return { data };
  } catch (error) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Unable to complete request after multiple attempts"
    );
  }
}
```

### Circuit Breaker Pattern

For protecting against cascading failures:

```typescript
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private failureThreshold = 5,
    private resetTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const now = Date.now();

      // Check if reset timeout has passed
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime > this.resetTimeout
      ) {
        this.state = "HALF_OPEN";
      } else {
        throw new AppError(
          503,
          "CIRCUIT_BREAKER_OPEN",
          "Service temporarily unavailable due to repeated failures"
        );
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit if it was half-open
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
    } else if (this.state === "HALF_OPEN") {
      this.state = "OPEN"; // Failed again while testing
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

export async function GET() {
  return userServiceBreaker.execute(() => database.users.findMany());
}
```

## Monitoring and Alerting

In production, you need to monitor errors and get alerted about critical issues:

```typescript
// src/utils/errorMonitoring.ts
export class ErrorMonitor {
  private criticalErrors: Set<string> = new Set([
    "DATABASE_CONNECTION_LOST",
    "OUT_OF_MEMORY",
    "FILE_SYSTEM_FULL",
  ]);

  constructor(
    private alertService: AlertService,
    private metricsService: MetricsService
  ) {}

  recordError(error: AppError, context: any) {
    // Increment error counter
    this.metricsService.increment("errors.total", {
      errorCode: error.code,
      statusCode: error.statusCode.toString(),
    });

    // Log error
    console.error(this.formatError(error, context));

    // Send alert for critical errors
    if (this.criticalErrors.has(error.code)) {
      this.alertService.sendCriticalAlert({
        title: `Critical Error: ${error.code}`,
        message: error.message,
        severity: "critical",
        context,
      });
    }

    // Send to external monitoring if configured
    if (process.env.ERROR_REPORTING_URL) {
      this.sendToExternalMonitoring(error, context);
    }
  }

  private formatError(error: AppError, context: any): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
      context: {
        ...context,
        // Don't log sensitive data
        headers: this.sanitizeHeaders(context.headers),
        body: this.sanitizeBody(context.body),
      },
    });
  }

  private sanitizeHeaders(headers: any) {
    const sensitive = ["authorization", "cookie", "x-api-key"];
    return Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        sensitive.includes(key.toLowerCase()) ? "[REDACTED]" : value,
      ])
    );
  }

  private sanitizeBody(body: any) {
    // Implement based on your application's sensitive fields
    return body;
  }
}
```

## Summary

Fastay's error handling system provides a comprehensive approach to building resilient APIs:

1. **Route-level handling** gives you control over specific error scenarios
2. **Custom error classes** ensure consistency across your application
3. **Global error handling** catches unexpected errors and provides appropriate responses
4. **Environment-aware** responses protect sensitive information in production
5. **Integration with validation libraries** provides clear validation feedback
6. **Monitoring and alerting** helps you stay on top of production issues

By following these patterns and best practices, you can build Fastay applications that are robust, maintainable, and provide excellent experiences for both API consumers and developers.

> **Remember:** Good error handling isn't just about catching errors—it's about providing clear, actionable feedback to clients while maintaining system stability and gathering the information you need to fix issues quickly.
