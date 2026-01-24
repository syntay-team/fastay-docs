---
title: "createApp"
description: "API reference for the createApp function, the entry point for configuring and bootstrapping Fastay applications."
---

# createApp

The `createApp` function initializes and configures a Fastay application. It automatically discovers routes, applies middleware, and prepares the Express.js application for HTTP request handling.

## Interface

```typescript
async function createApp(options: CreateAppOptions): Promise<{
  app: Express.Application;
  server: http.Server;
}>;
```

## CreateAppOptions

```typescript
interface CreateAppOptions {
  /** Directory containing route files (default: "./src/api") */
  apiDir?: string;

  /** Base path for all routes (default: "/api") */
  baseRoute?: string;

  /** Application mode: "dev", "prod", or "test" (default: "dev") */
  mode?: "dev" | "prod" | "test";

  /** Port for HTTP server (default: 3000) */
  port?: number;

  /** Whether to include X-Powered-By: Fastay.js header (default: true) */
  powered?: boolean;

  /** Fastay-specific middleware configuration */
  middlewares?: MiddlewareMap;

  /** CORS configuration */
  enableCors?: CorsOptions;

  /** Low-level Express.js configuration */
  expressOptions?: ExpressOptions;
}

interface CorsOptions {
  allowAnyOrigin?: boolean;
  cookieOrigins?: string[];
  credentials?: boolean;
  methods?: string;
  headers?: string;
  exposedHeaders?: string;
  maxAge?: number;
}

interface ExpressOptions {
  middlewares?: express.RequestHandler[];
  jsonOptions?: Parameters<typeof express.json>[0];
  urlencodedOptions?: Parameters<typeof express.urlencoded>[0];
  errorHandler?: express.ErrorRequestHandler;
  static?: { path: string; options?: ServeStaticOptions };
  views?: { engine: string; dir: string };
  trustProxy?: boolean;
  locals?: Record<string, any>;
}

type MiddlewareMap = Record<string, Function[]>;
```

## Properties

### apiDir

- **Type**: `string`
- **Default**: `"./src/api"`
- **Optional**: Yes
- **Description**: Directory where Fastay discovers route files. Each subdirectory becomes an endpoint, and `route.ts` files define HTTP method handlers.

### baseRoute

- **Type**: `string`
- **Default**: `"/api"`
- **Optional**: Yes
- **Description**: Base path prefix for all discovered routes. Routes in `apiDir` are mounted under this path.

### mode

- **Type**: `"dev" | "prod" | "test"`
- **Default**: `"dev"`
- **Optional**: Yes
- **Description**: Application mode affecting Fastay's internal behavior. This is separate from `process.env.NODE_ENV`, which may affect Express.js and third-party middleware. Fastay respects `mode` for its own configuration decisions.

### port

- **Type**: `number`
- **Default**: `5000`
- **Optional**: Yes
- **Description**: Port for the HTTP server. Use `0` in test mode to automatically select an available port.

### powered

- **Type**: `boolean`
- **Default**: `true`
- **Optional**: Yes
- **Description**: Controls the `X-Powered-By: Fastay.js` response header. Set to `false` to disable.

### middlewares

- **Type**: `MiddlewareMap`
- **Optional**: Yes
- **Description**: Fastay middleware configuration mapping route patterns to middleware arrays. Middleware executes before route handlers.

#### Path Matching Rules

- **Exact match**: `"/api/users"` matches only `/api/users`
- **Wildcard suffix**: `"/api/users/"` matches `/api/users/123`, `/api/users/profile`, etc.
- **Global wildcard**: `"/"` matches all routes
- **Order**: Specific routes execute before generic routes. For overlapping patterns, the most specific match takes precedence.

#### Example

```typescript
middlewares: {
  "/api/users": [auth, validateUser],     // Exact match
  "/api/admin/*": [auth, requireAdmin],  // Wildcard match
  "/": [requestLogger],                  // Global middleware
}
```

### enableCors

- **Type**: `CorsOptions`
- **Optional**: Yes
- **Description**: Comprehensive CORS configuration. When not provided, CORS headers are not set.

#### CorsOptions Properties

- `allowAnyOrigin`: Allow requests from any origin (use cautiously in production)
- `cookieOrigins`: Specific origins allowed to send cookies
- `credentials`: Enable cross-origin cookie sending
- `methods`: Comma-separated allowed HTTP methods
- `headers`: Comma-separated allowed request headers
- `exposedHeaders`: Comma-separated headers exposed to client
- `maxAge`: Preflight request cache time in seconds

### expressOptions

- **Type**: `ExpressOptions`
- **Optional**: Yes
- **Description**: Low-level Express.js configuration applied before Fastay's internal setup.

#### ExpressOptions Properties

- `middlewares`: Global Express middleware applied to all routes
- `jsonOptions`: Configuration for `express.json()` middleware
- `urlencodedOptions`: Configuration for `express.urlencoded()` middleware
- `errorHandler`: Custom global error handler
- `static`: Static file serving configuration
- `views`: Template engine configuration
- `trustProxy`: Enable when behind reverse proxy
- `locals`: Global variables available in templates and responses

## Return Value

Returns a Promise resolving to an object containing:

```typescript
{
  app: Express.Application,  // Express application instance
  server: http.Server        // HTTP server instance
}
```

Both objects are fully configured and ready for use. The server is not automatically started unless `port` is specified.

## Usage

### Basic Configuration

```typescript
import { createApp } from "@syntay/fastay";

const { app, server } = await createApp({
  apiDir: "./src/api",
  baseRoute: "/api",
  port: 5000,
});

// Server is already listening on port 5000
```

### With Middleware

```typescript
const { app } = await createApp({
  middlewares: {
    "/api/protected/*": [authentication],
    "*": [requestLogger],
  },
});
```

### With Express Options

```typescript
const { app } = await createApp({
  expressOptions: {
    middlewares: [helmet(), compression()],
    jsonOptions: { limit: "10mb" },
    trustProxy: true,
  },
});
```

## Mode vs NODE_ENV

Fastay uses two separate configuration mechanisms:

1. **`mode`**: Controls Fastay-specific behavior
   - `"dev"`: Development features enabled
   - `"prod"`: Production optimizations applied
   - `"test"`: Test-specific configuration

2. **`process.env.NODE_ENV`**: Standard Node.js environment variable affecting Express.js and third-party middleware
   - Often set to `"development"`, `"production"`, or `"test"`

These can be used independently:

```typescript
// Different mode and NODE_ENV values
await createApp({
  mode: "prod", // Fastay production mode
  expressOptions: {
    // Express respects NODE_ENV, which might be different
  },
});
```

## Middleware Execution Order

Middlewares execute in this specific sequence:

1. **Global Express middlewares** (`expressOptions.middlewares`)
2. **Route-specific Fastay middlewares** (`middlewares` option, most specific first)
3. **Route handler** (from `apiDir`)

Example execution flow for `/api/users/123`:

```
Express global middleware → Fastay "/api/users/*" middleware → GET handler
```

## Non-HTTP Protocols

Fastay focuses on HTTP-based APIs. For WebSocket, GraphQL, or other protocols:

1. **Access the underlying Express app**:

   ```typescript
   const { app } = await createApp({
     /* options */
   });

   // Add WebSocket or other protocol handlers
   const httpServer = app.listen(5000);
   const wss = new WebSocket.Server({ server: httpServer });
   ```

2. **Mount additional services**:
   ```typescript
   const { app } = await createApp({
     /* options */
   });
   app.use("/graphql", graphqlHandler);
   ```

Fastay handles HTTP routing and middleware; additional protocols integrate via the returned Express application.

## Error Conditions

`createApp` may throw errors when:

- Port is already in use (unless `port: 0`)
- `apiDir` doesn't exist or isn't readable
- Invalid configuration values provided
- Route discovery fails

## Default Behavior

When options are omitted, Fastay provides sensible defaults:

- **Routes**: Automatically discovered from `./src/api`
- **Health check**: `GET /_health` endpoint available
- **Body parsing**: JSON and URL-encoded parsers with default limits
- **Static files**: Not served unless configured via `expressOptions.static`

## See Also

- [Middleware API](./middleware-api.md) – Detailed middleware configuration
- [Request Object](./request-object.md) – Route handler request interface
- [Response Object](./response-object.md) – Route handler response interface
