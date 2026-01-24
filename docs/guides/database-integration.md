---
title: "Database Integration"
description: "Learn how to integrate databases with Fastay using clean architecture patterns that keep your code maintainable and database-agnostic."
---

# Database Integration in Fastay

Fastay provides the structure for building APIs, but most real-world applications need persistent data storage. Database integration is where your Fastay application connects to data sources like PostgreSQL, MySQL, MongoDB, or SQLite to store and retrieve information.

## Why Database Integration Matters

Without database integration, your Fastay application is stateless—it cannot remember user data, application state, or any persistent information between requests. Database integration enables:

- **User authentication and sessions**: Store user credentials and session data
- **Business data persistence**: Save products, orders, blog posts, etc.
- **Relationships and queries**: Connect related data (users have posts, products have categories)
- **Data validation and integrity**: Ensure data follows business rules

Fastay doesn't include a built-in database solution by design. This gives you flexibility to choose the best database and access pattern for your specific needs.

## Recommended Architecture Patterns

### Service Layer Pattern

The most maintainable approach in Fastay is the service layer pattern:

```
Request → Route Handler → Service → Database
```

In this pattern:

- **Route handlers** handle HTTP concerns (request/response, validation, status codes)
- **Services** contain business logic and database operations
- **Database layer** handles raw data access

This separation keeps your code organized and testable. Route handlers stay clean, and database logic is isolated in dedicated service classes.

### Database Connection Management

For database connections, use a singleton pattern or dependency injection:

```typescript
// Singleton pattern (simple and effective)
// src/lib/database.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

This approach ensures a single database connection pool is reused across your application, which is important for performance and connection limit management.

## Database Access Options

Fastay works with any Node.js database library. Choose based on your needs:

### ORM (Object-Relational Mapping)

**[Prisma](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres)** (Recommended for TypeScript):

- Type-safe database client
- Auto-generated TypeScript types
- Migration system included
- Good developer experience

**[TypeORM](https://typeorm.io/docs/getting-started/)**:

- Decorator-based entity definitions
- Supports both Active Record and Data Mapper patterns
- Mature with many features

**[Sequelize](https://sequelize.org/)**:

- Mature and stable
- Good documentation
- Supports many SQL dialects

### Query Builders

**[Knex.js](https://knexjs.org/)**:

- Flexible SQL query builder
- Supports migrations
- Less abstraction than ORMs
- Good for complex queries

### Raw Database Drivers

**[pg](https://www.postgresql.org/) / [mysql2](https://sidorares.github.io/node-mysql2/docs) / [sqlite3](https://sqlite.org/docs.html)**:

- Direct database access
- Maximum control and performance
- More boilerplate code
- SQL injection risks if not careful

For most Fastay applications, an ORM like Prisma provides the best balance of type safety, productivity, and maintainability.

## Practical Implementation with Prisma

While Fastay supports any database library, here's a practical example using Prisma, which works particularly well with Fastay's TypeScript-first approach.

### Prisma Schema Definition

Create a `prisma/schema.prisma` file to define your database schema:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Database Client Instance

Create a shared database instance to use across your application:

```typescript
// src/lib/database.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export { db };
```

### Service Layer Implementation

Create services that use the database client:

```typescript
// src/services/user-service.ts
import { db } from "../lib/database";

export class UserService {
  async createUser(data: { email: string; name?: string }) {
    return db.user.create({
      data: {
        email: data.email,
        name: data.name,
      },
    });
  }

  async findUserById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: { posts: true },
    });
  }

  async findUsers(options: { page?: number; limit?: number }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
```

### Route Handler Integration

Use the service in your route handlers:

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";
import { UserService } from "../../services/user-service";

const userService = new UserService();

export async function GET(request: Request) {
  const { page, limit } = request.query;
  const result = await userService.findUsers({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  return result;
}

export async function POST(request: Request) {
  const userData = await request.body;

  try {
    const user = await userService.createUser(userData);
    return {
      status: 201,
      body: {
        message: "User created successfully",
        user,
      },
    };
  } catch (error) {
    if (error.code === "P2002") {
      // Prisma unique constraint error
      return {
        status: 409,
        body: { error: "Email already exists" },
      };
    }
    throw error; // Let global error handler handle it
  }
}
```

## Environment Configuration

Database configuration should come from environment variables, not hardcoded values:

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

In your Fastay application, load these variables:

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";
import "dotenv/config"; // Load .env file

void (async () => {
  await createApp({
    port: process.env.PORT || 5000,
    apiDir: "./src/api",
    baseRoute: "/api",
  });
})();
```

For production, use your platform's environment variable management (like Railway, Render, or AWS Secrets Manager).

## Database Migrations

Migrations manage changes to your database schema over time. The process varies by database tool:

### Prisma Migrations

```bash
# Create a new migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### TypeORM Migrations

```bash
# Generate migration
npx typeorm migration:generate -n InitialMigration

# Run migrations
npx typeorm migration:run
```

### Knex Migrations

```bash
# Create migration
npx knex migrate:make migration_name

# Run migrations
npx knex migrate:latest
```

Always run migrations as part of your deployment process, and never modify production databases manually.

## Keeping Database Code Clean

Follow these practices to maintain clean database code:

1. **Single database instance**: Create one database client instance in `src/lib/database.ts` and import it everywhere needed.

2. **Service layer separation**: Keep all database operations in service classes in `src/services/`. Route handlers should only call service methods.

3. **Type safety**: Use TypeScript interfaces or generated types for database entities.

4. **Error handling**: Handle database errors in services or middleware, not in route handlers.

5. **Connection management**: Ensure proper connection pooling and cleanup.

6. **Testing**: Mock database services in tests to keep tests fast and isolated.

## Swapping Database Tools

One advantage of the service layer pattern is that you can swap database implementations without changing your route handlers.

If you start with Prisma but later need to switch to raw SQL for performance:

```typescript
// Before: Using Prisma in service
export class UserService {
  async findUsers() {
    return db.user.findMany();
  }
}

// After: Using raw SQL in same service interface
export class UserService {
  async findUsers() {
    const result = await db.query("SELECT * FROM users");
    return result.rows;
  }
}

// Route handlers remain unchanged!
export async function GET(request: Request) {
  const users = await userService.findUsers();
  return { users };
}
```

The key is maintaining the same service method signatures. Your route handlers depend on the service interface, not the database implementation.

## Best Practices Summary

1. **Use the service layer pattern** to separate database logic from HTTP concerns.

2. **Choose an ORM like Prisma** for most applications—it provides type safety and reduces boilerplate.

3. **Manage database connections centrally** with a singleton pattern to avoid connection limits.

4. **Store database configuration in environment variables** for security and flexibility.

5. **Use migrations** to manage schema changes, never modify databases manually.

6. **Keep database code in services**, not route handlers, to maintain separation of concerns.

7. **Plan for change** by designing services with interchangeable database implementations.

By following these patterns, your Fastay application will have a clean, maintainable database layer that can evolve as your needs change, from prototype to production.
