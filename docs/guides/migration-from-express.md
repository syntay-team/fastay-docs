---
title: "Migration from Express"
---

# Migrating from Express.js to Fastay

If you have an existing Express.js application, migrating to Fastay can provide structure, reduce boilerplate, and improve developer experience through file-based routing and TypeScript-first design. This guide explains the migration process, showing how Express.js patterns map to Fastay equivalents.

## Why Migrate from Express.js to Fastay

Express.js offers flexibility but often leads to inconsistent project structures and manual route registration. Fastay provides conventions that eliminate common pain points:

- **File-based routing** replaces manual `app.get()` calls with automatic route discovery
- **Consistent structure** organizes your code predictably
- **TypeScript integration** provides better type safety out of the box
- **Reduced boilerplate** eliminates repetitive route setup code
- **Middleware organization** provides clear patterns for request processing

Migration makes sense when you want more structure without sacrificing Express.js's flexibility, or when your Express.js application has grown complex and needs better organization.

## Understanding the Migration Strategy

Migrating from Express.js to Fastay doesn't require rewriting everything at once. You can migrate incrementally, starting with new routes in Fastay while keeping existing Express.js routes working. The key is understanding how Express.js patterns map to Fastay equivalents.

### Migration Approaches

**Big Bang Migration**: Convert your entire application at once. This works for smaller applications or when you can allocate dedicated migration time.

**Incremental Migration**: Run both Express.js and Fastay side-by-side, migrating routes gradually. This minimizes risk and allows testing each migrated route individually.

**New Features First**: Build new features with Fastay while maintaining existing Express.js routes. Over time, migrate older routes as you modify them.

## Mapping Express.js Patterns to Fastay

### Basic Route Mapping

Express.js route:

```javascript
// Express.js
app.get("/api/users", async (req, res) => {
  const users = await db.users.findMany();
  res.json(users);
});
```

Fastay equivalent:

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  const users = await db.users.findMany();
  return users;
}
```

Notice the differences:

- No manual route registration in Fastay
- Route location determines URL (`/api/users`)
- Return value replaces explicit `res.json()`
- TypeScript types are available automatically

### Route Parameters

Express.js:

```javascript
app.get("/api/users/:id", async (req, res) => {
  const user = await db.users.findUnique({
    where: { id: req.params.id },
  });
  res.json(user);
});
```

Fastay:

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  const { id } = request.params;
  const user = await db.users.findUnique({
    where: { id },
  });
  return user;
}
```

The `[id]` folder name creates a dynamic route parameter automatically.

### Middleware Migration

Express.js middleware often handles authentication, logging, or validation:

```javascript
// Express.js middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Verify token and attach user
  req.user = verifyToken(token);
  next();
}

// Applying middleware
app.use("/api/protected", authMiddleware);
app.get("/api/protected/data", (req, res) => {
  res.json({ data: "protected", user: req.user });
});
```

Fastay organizes middleware differently:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function auth(request: Request, response: Response, next: Next) {
  const token = request.headers.authorization;
  if (!token) {
    return response.status(401).json({ error: "Unauthorized" });
  }
  request.user = verifyToken(token);
  next();
}

// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";
import { auth } from "./auth";

export const middleware = createMiddleware({
  "/api/protected": [auth],
});

// src/api/protected/data/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  return {
    data: "protected",
    user: request.user,
  };
}
```

Fastay's middleware system is more explicit about which routes use which middleware.

### Error Handling Migration

Express.js error handling:

```javascript
// Express.js error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// Route with error
app.get("/api/error-prone", async (req, res, next) => {
  try {
    throw new Error("Something went wrong");
  } catch (err) {
    next(err);
  }
});
```

Fastay error handling:

```typescript
// Global error handling via expressOptions
await createApp({
  expressOptions: {
    errorHandler: (error, request, response, next) => {
      console.error(error);
      response.status(500).json({
        error: "Something went wrong",
        // Add more context as needed
      });
    },
  },
});

// Route error handling
export async function GET(request: Request) {
  try {
    throw new Error("Something went wrong");
  } catch (error) {
    // Can handle locally or let it bubble to global handler
    throw error;
  }
}
```

Fastay integrates with Express.js's error handling while providing TypeScript support.

## Step-by-Step Migration Process

### Phase 1: Setup and Configuration

1. **Create a new Fastay project** alongside your existing Express.js app:

   ```bash
   npx fastay create-app fastay-migration
   ```

2. **Copy shared code**: Move utilities, services, and database logic from your Express.js app to the Fastay project's `src/services/` and `src/utils/` directories.

3. **Configure environment variables**: Ensure the same environment variables work in both applications.

### Phase 2: Parallel Run Setup

Run both applications during migration:

```typescript
// In your Express.js app, proxy unmigrated routes to Fastay
// or vice versa depending on migration direction

// Option 1: Express.js proxies to Fastay for migrated routes
const fastayApp = await createFastayApp();
expressApp.use("/api/migrated-routes", fastayApp);

// Option 2: Run on different ports and use a reverse proxy
// Express.js on port 3000, Fastay on port 3001
// Nginx or similar routes requests appropriately
```

This setup lets you test migrated routes while keeping the old application functional.

### Phase 3: Route Migration

Migrate routes one at a time, following this pattern for each:

1. **Identify the Express.js route** and its functionality
2. **Create the Fastay route file** in the appropriate location
3. **Move business logic** to services if not already separated
4. **Test the migrated route** while both applications run
5. **Update routing** to use the Fastay version
6. **Remove the Express.js route** once confirmed working

### Phase 4: Middleware Migration

Migrate middleware after routes are stable:

1. **Identify Express.js middleware** and their purposes
2. **Convert to Fastay middleware** format
3. **Configure in `middleware.ts`** with appropriate route patterns
4. **Test middleware behavior** matches Express.js version

### Phase 5: Final Switch

Once all routes and middleware are migrated:

1. **Run comprehensive tests** on the Fastay application
2. **Update deployment configuration** to use Fastay exclusively
3. **Decommission the Express.js application**
4. **Monitor for issues** and address any remaining differences

## Common Migration Challenges

### Challenge: Complex Route Patterns

Express.js supports complex route patterns with regex and multiple parameters. Fastay uses file-based routing with folder structures.

**Solution**: Restructure complex routes into clearer patterns. For highly dynamic routes, consider if they can be simplified or if you need a catch-all route handler.

### Challenge: App-Level Configuration

Express.js applications often have extensive `app.use()` configurations for things like CORS, body parsing, and static files.

**Solution**: Use Fastay's `expressOptions` to configure these globally:

```typescript
await createApp({
  expressOptions: {
    middlewares: [cors(), helmet(), express.json()],
    static: {
      path: "public",
    },
  },
});
```

### Challenge: Third-Party Middleware

Express.js middleware packages usually work with Fastay since it's built on Express.js.

**Solution**: Add them through `expressOptions.middlewares` or convert them to Fastay middleware format if they need route-specific application.

### Challenge: WebSocket or Special Protocols

Fastay is designed with a clear focus on HTTP APIs, but it does not block or restrict other protocols. Since Fastay exposes both the Express application instance and the underlying Node.js HTTP server, real-time protocols like WebSocket or Socket.IO can be attached directly to the server layer.

**Solution:** Use Fastay for structured HTTP routes and middleware, and attach WebSocket or other protocol handlers directly to the provided Node.js server. This keeps responsibilities clean: Fastay handles HTTP, while real-time or special protocols live alongside it, using the same server instance.

```typescript
// src/index.ts
import { Server } from "socket.io";

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket conectado:", socket.id);

  socket.on("ping", () => {
    socket.emit("pong");
  });
});
```

## Migration Example: User API

Let's migrate a complete user API from Express.js to Fastay.

### Express.js Original

```javascript
// Express.js routes
const express = require("express");
const router = express.Router();

router.get("/users", async (req, res) => {
  const users = await UserService.getAll();
  res.json(users);
});

router.get("/users/:id", async (req, res) => {
  const user = await UserService.getById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

router.post("/users", async (req, res) => {
  const user = await UserService.create(req.body);
  res.status(201).json(user);
});

app.use("/api", router);
```

### Fastay Migration

First, create the service (shared logic):

```typescript
// src/services/user-service.ts
export class UserService {
  static async getAll() {
    return db.users.findMany();
  }

  static async getById(id: string) {
    return db.users.findUnique({ where: { id } });
  }

  static async create(data: any) {
    return db.users.create({ data });
  }
}
```

Then create the Fastay routes:

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";
import { UserService } from "@/services/user-service";

export async function GET(request: Request) {
  const users = await UserService.getAll();
  return users;
}

export async function POST(request: Request) {
  const userData = await request.body;
  const user = await UserService.create(userData);
  return {
    status: 201,
    body: user,
  };
}
```

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";
import { UserService } from "@/services/user-service";

export async function GET(request: Request) {
  const { id } = request.params;
  const user = await UserService.getById(id);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  return user;
}
```

## Post-Migration Benefits

After migrating to Fastay, you'll notice several improvements:

**Clearer project structure**: Files are organized by feature with predictable locations.

**Reduced boilerplate**: No more manual route registration or repetitive middleware setup.

**Better TypeScript support**: Route handlers, middleware, and services have proper typing.

**Easier testing**: The separation of concerns makes unit and integration testing more straightforward.

**Consistent patterns**: Team members can understand the codebase faster due to consistent conventions.

## When Not to Migrate

Consider keeping Express.js if:

- Your application heavily uses Express.js-specific features not supported by Fastay
- You have extensive investment in Express.js tooling and deployment processes
- The migration effort outweighs the benefits for your specific use case
- Your team is highly productive with Express.js and the current structure works well

Fastay isn't a drop-in replacement for Express.js but rather a structured approach to building APIs. For some applications, the flexibility of Express.js may be more important than the structure Fastay provides.

Migration from Express.js to Fastay is a process of translating patterns and leveraging Fastay's conventions to reduce boilerplate and improve maintainability. By following this guide and migrating incrementally, you can transition smoothly while maintaining application stability.
