---
title: "Middleware API"
description: "Official API reference for Fastay's middleware system, including type definitions, registration patterns, and execution rules."
---

# Middleware API

Fastay's middleware system provides a structured way to intercept and process HTTP requests before they reach route handlers. This reference documents the official middleware API contract.

## Type Definitions

### Middleware Function

```typescript
/**
 * Official Fastay middleware function signature.
 * Receives Request, Response, and Next function parameters.
 */
type Middleware = (
  request: Request,
  response: Response,
  next: Next,
) => Promise<void> | void;
```

### Next Function

```typescript
/**
 * Control function passed to middleware to continue execution.
 * Fastay supports standard Express.js next() semantics.
 */
type Next = () => void;
```

### Error Middleware

```typescript
/**
 * Error-handling middleware signature (four parameters).
 * Must be registered via expressOptions.errorHandler in createApp.
 */
type ErrorMiddleware = (
  error: Error,
  request: Request,
  response: Response,
  next: Next,
) => Promise<void> | void;
```

### Middleware Map

```typescript
/**
 * Configuration structure for middleware registration.
 * Keys are route patterns, values are middleware arrays.
 */
type MiddlewareMap = Record<string, Middleware[]>;
```

## Middleware Registration

### Using createApp

Middleware is registered through the `createApp` function's `middlewares` option:

```typescript
import { createApp } from "@syntay/fastay";
import { auth, logger } from "./middlewares";

await createApp({
  apiDir: "./src/api",
  baseRoute: "/api",
  middlewares: {
    "/api/users": [auth],
    "/api/admin": [auth, adminOnly],
    "/api": [logger],
  },
});
```

### createMiddleware Function

```typescript
/**
 * Creates a middleware configuration object.
 * @param config - Object mapping route patterns to middleware arrays
 * @returns MiddlewareMap ready for use with createApp
 */
function createMiddleware(config: MiddlewareMap): MiddlewareMap;
```

**Example**:

```typescript
import { createMiddleware } from "@syntay/fastay";

export const middleware = createMiddleware({
  "/api/users": [auth],
  "/": [requestLogger],
});
```

## Execution Order

Middleware executes in this guaranteed order:

1. **Global Express middlewares** (configured via `expressOptions.middlewares`)
2. **Route-specific Fastay middlewares** (configured via `middlewares` option)
3. **Route handler** (from file-based routing)

Within route-specific middleware, execution follows pattern specificity, then definition order.

### Example Execution Flow

```typescript
// Configuration
export const middleware = createMiddleware({
  "/api/users": [auth, validate], // 1. Exact match middleware
  "/api": [logger], // 2. Wildcard middleware
  "/": [requestId], // 3. Global middleware
});

// Request to /api/users executes:
// 1. Express global middlewares
// 2. auth middleware
// 3. validate middleware
// 4. logger middleware
// 5. requestId middleware
// 6. Route handler
```

## Middleware Context Contract

### Request Object

Middleware receives the Fastay Request object (extends Express.js Request). Middleware may add properties to the request object, but Fastay does not enforce any schema for these additions.

**Note**: Properties added to request objects are not type-safe by default. Users should implement their own type declarations if needed.

### Response Object

Middleware receives the Fastay Response object (extends Express.js Response). Middleware may modify response headers, status, and body.

### Next Function Control

Middleware controls execution flow using the `next()` function:

```typescript
export async function exampleMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  // Continue to next middleware or route handler
  next();

  // Stop execution and send response
  // response.status(403).end();

  // Pass error to error-handling middleware
  // next(new Error('Something went wrong'));
}
```

**Express Compatibility**: Fastay supports standard Express.js `next()` semantics, including `next('route')` for route skipping.

## Error Handling Middleware

Error-handling middleware must be registered through Express.js configuration:

```typescript
await createApp({
  expressOptions: {
    errorHandler: (error, request, response, next) => {
      // Handle errors
      response.status(500).json({ error: "Internal error" });
    },
  },
});
```

## Built-in Middleware Examples

### Authentication Middleware

```typescript
import { Request, Response, Next } from "@syntay/fastay";

export async function authMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const token = request.headers.authorization?.split(" ")[1];

  if (!token) {
    return response.status(401).json({
      error: "Authentication required",
    });
  }

  // Verify token and attach user
  try {
    const user = await verifyToken(token);
    request.user = user; // Custom property addition
    next();
  } catch (error) {
    return response.status(401).json({
      error: "Invalid token",
    });
  }
}
```

### Request Logging Middleware

```typescript
export async function requestLogger(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  response.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`${request.method} ${request.path} - ${duration}ms`);
  });

  next();
}
```

## Express.js Compatibility

Fastay middleware is compatible with Express.js middleware. Express middleware can be used through:

1. **Global registration** via `expressOptions.middlewares`
2. **Direct usage** in Fastay middleware functions
3. **Error handling** via `expressOptions.errorHandler`

### Using Express Middleware

```typescript
import cors from "cors";
import helmet from "helmet";

await createApp({
  expressOptions: {
    middlewares: [cors(), helmet()],
  },
});
```

## Type Safety Considerations

Fastay provides TypeScript definitions for core middleware types. Custom request properties should be declared using TypeScript module augmentation:

```typescript
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}
```

## API Contract Guarantees

Fastay guarantees:

1. **Execution Order**: Middleware executes in documented order
2. **Pattern Matching**: Route patterns follow prefix-based matching rules
3. **Request/Response Objects**: Standard Express.js interfaces are provided
4. **Error Propagation**: Errors passed to `next()` reach error handlers
5. **Express Compatibility**: Standard Express.js middleware patterns work

Fastay does not guarantee:

1. **Request Property Safety**: Custom properties are not validated
2. **Middleware Composition**: No built-in composition utilities
3. **Performance Characteristics**: Execution time not guaranteed
4. **Error Recovery**: Middleware errors may terminate requests

## See Also

- [createApp](./create-app.md) - Application configuration
- [Request Object](./request-object.md) - Request interface details
- [Response Object](./response-object.md) - Response interface details
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html) - Underlying middleware system
