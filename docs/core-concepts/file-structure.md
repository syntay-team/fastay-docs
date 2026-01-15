---
title: "File Structure"
---

# Project Structure in Fastay

Fastay employs a well-organized, convention-based file structure that balances simplicity with scalability. This structured approach enables rapid development while maintaining long-term maintainability as your application grows.

## Understanding the Fastay Philosophy

Fastay's file structure is designed around a core principle: **convention over configuration**. By following established patterns, you spend less time configuring and more time building features. The structure is intuitive, with each directory serving a clear, distinct purpose that aligns with common backend development patterns.

### Why Structure Matters

A well-organized project structure:

- **Accelerates onboarding**: New team members can quickly understand the codebase
- **Improves maintainability**: Related code stays together, making changes predictable
- **Enhances scalability**: The structure grows naturally with your application
- **Facilitates testing**: Organized code is easier to test in isolation
- **Reduces cognitive load**: Developers spend less time searching and more time coding

## The Standard Fastay Structure

When you create a new Fastay project using `npx fastay create-app my-app`, you'll get the following organized structure:

```

my-app/
├── src/
│ ├── api/
│ ├── middlewares/
│ ├── services/
│ ├── utils/
│ └── index.ts
├── dist/
├── public/
├── fastay.config.json
├── package.json
└── tsconfig.json

```

Let's explore each component in detail.

## Core Directories Explained

### The `src/` Directory: Your Application's Heart

The `src/` (source) directory contains all your application logic. This separation from configuration files and build artifacts keeps your project clean and focused.

### `src/api/` - API Routes (The Foundation)

This is where Fastay's magic happens. The `api/` directory uses a file-based routing system where each folder automatically becomes an API endpoint.

```

src/api/
├── hello/
│ └── route.ts # → GET /api/hello
├── users/
│ ├── route.ts # → GET/POST /api/users
│ └── [id]/
│ └── route.ts # → GET/PUT/DELETE /api/users/:id
└── posts/
├── route.ts # → GET/POST /api/posts
└── [id]/
├── route.ts # → GET/PUT/DELETE /api/posts/:id
└── comments/
└── route.ts # → GET/POST /api/posts/:id/comments

```

#### Key Principles of API Structure

1. **Each endpoint is a folder**: Folders map directly to URL paths
2. **`route.ts` is special**: This file name is required and contains your HTTP method handlers
3. **Square brackets for dynamics**: `[id]` becomes `:id` in the URL
4. **Nesting creates nested routes**: Folders inside folders create path hierarchies

#### A Complete Route Example

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";

// GET /api/users
export async function GET(request: Request) {
  const { page, limit } = request.query;
  // Business logic here
  return { users: [] };
}

// POST /api/users
export async function POST(request: Request) {
  const userData = await request.body;
  // Create user logic
  return { message: "User created" };
}
```

#### Dynamic Routes in Practice

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";

// GET /api/users/:id
export async function GET(request: Request) {
  const { id } = request.params;
  // Fetch specific user
  return { user: { id, name: "John" } };
}
```

### `src/middlewares/` - Request Processing Layer

Middlewares in Fastay intercept and process requests before they reach your route handlers. This directory houses reusable logic like authentication, validation, and logging.

```
src/middlewares/
├── auth.ts              # Authentication middleware
├── logger.ts            # Request logging
├── validation.ts        # Input validation
├── rateLimit.ts         # Rate limiting
└── middleware.ts        # Middleware configuration
```

#### The Middleware Configuration File

The `middleware.ts` file is where you define which middlewares apply to which routes:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";
import { auth } from "./auth";
import { logger } from "./logger";
import { validateUser } from "./validation";

export const middleware = createMiddleware({
  // Apply to all routes
  "*": [logger],

  // Apply to specific routes
  "/api/users": [auth, validateUser],
  "/api/admin/*": [auth, adminOnly],

  // Public routes (no auth)
  "/api/public/*": [],
});
```

#### Creating a Custom Middleware

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function auth(request: Request, response: Response, next: Next) {
  const token = request.headers.authorization?.split(" ")[1];

  if (!token) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  // Verify token and attach user to request
  try {
    const user = verifyToken(token);
    request.user = user;
    next();
  } catch (error) {
    return response.status(401).json({ error: "Invalid token" });
  }
}
```

### `src/services/` - Business Logic Layer

Services contain your core business logic, separated from HTTP concerns. This separation follows the Single Responsibility Principle and makes your code more testable.

```
src/services/
├── user-service.ts      # User-related business logic
├── product-service.ts   # Product-related business logic
├── email-service.ts     # Email sending logic
└── payment-service.ts   # Payment processing
```

#### Service Pattern Example

```typescript
// src/services/user-service.ts
export class UserService {
  async createUser(data: CreateUserDto) {
    // Validation
    if (!data.email.includes("@")) {
      throw new Error("Invalid email");
    }

    // Business rules
    if (data.age < 18) {
      throw new Error("User must be at least 18 years old");
    }

    // Database operations
    const user = await database.users.create({
      data: {
        email: data.email,
        name: data.name,
        age: data.age,
      },
    });

    // Side effects (email, notifications, etc.)
    await emailService.sendWelcomeEmail(user.email);

    return user;
  }

  async findUsers(filters: UserFilters) {
    // Complex query logic
    return database.users.findMany({
      where: this.buildWhereClause(filters),
      include: { profile: true },
    });
  }
}
```

#### Using Services in Routes

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";
import { UserService } from "../../services/user-service";

const userService = new UserService();

export async function POST(request: Request) {
  const userData = await request.body;

  try {
    const user = await userService.createUser(userData);
    return { user };
  } catch (error) {
    return {
      status: 400,
      body: { error: error.message },
    };
  }
}
```

### `src/utils/` - Helper Functions and Utilities

The `utils/` directory is for reusable helper functions, constants, and shared utilities that don't fit neatly into services or middlewares.

```
src/utils/
├── formatters.ts        # Data formatting functions
├── validators.ts        # Validation utilities
├── constants.ts         # Application constants
├── helpers.ts           # General helper functions
└── errors.ts           # Custom error classes
```

#### Utility Examples

```typescript
// src/utils/formatters.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// src/utils/constants.ts
export const API_RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
};

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
} as const;
```

### `src/index.ts` - Application Entry Point

This is your application's main file where Fastay is initialized and configured.

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";

void (async () => {
  await createApp({
    // Server configuration
    port: process.env.PORT || 5000,

    // Routing configuration
    apiDir: "./src/api",
    baseRoute: "/api",

    // Middleware configuration
    middlewares: {
      "/api/protected": [authMiddleware],
    },

    // Express configuration
    expressOptions: {
      middlewares: [
        // Global Express middlewares
      ],
      enableCors: {
        allowAnyOrigin: process.env.NODE_ENV === "development",
      },
    },
  });
})();
```

## Supporting Directories

### `dist/` - Compiled Output

When you build your Fastay application for production, TypeScript compiles to JavaScript in this directory. This separation keeps source and build artifacts distinct.

```
dist/
├── api/
├── middlewares/
├── services/
├── utils/
└── index.js
```

**Important**: Never modify files in `dist/` directly—they are automatically generated from your `src/` files.

### `public/` - Static Assets

The `public/` directory serves static files like images, CSS, JavaScript, and HTML files. Fastay automatically serves these files at the root URL.

```
public/
├── images/
│   ├── logo.png
│   └── favicon.ico
├── styles/
│   └── main.css
└── index.html
```

Files in `public/` are accessible directly:

- `public/images/logo.png` → `http://localhost:5000/images/logo.png`
- `public/index.html` → `http://localhost:5000/`

### Configuration Files

#### `fastay.config.json` - Build Configuration

This optional configuration file lets you customize Fastay's build process:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### `package.json` - Dependencies and Scripts

Your project's metadata, dependencies, and scripts:

```json
{
  "name": "my-fastay-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "dev:watch": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@syntay/fastay": "^1.0.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

## Advanced Structure Patterns

As your application grows, you might evolve the structure. Here are common patterns for scaling:

### Feature-Based Organization

For larger applications, organize by feature rather than by technical layer:

```
src/
├── features/
│   ├── auth/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── middleware.ts
│   ├── users/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   └── products/
│       ├── routes.ts
│       ├── service.ts
│       └── validators.ts
├── shared/
│   ├── middleware/
│   ├── utils/
│   └── types/
└── index.ts
```

### Module-Based Organization

Similar to feature-based but with more isolation:

```
src/
├── modules/
│   ├── user-module/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   └── user.types.ts
│   └── product-module/
│       ├── product.controller.ts
│       ├── product.service.ts
│       └── product.repository.ts
├── core/
│   ├── database/
│   ├── config/
│   └── shared/
└── app.ts
```

### Domain-Driven Design (DDD) Structure

For complex domain logic:

```
src/
├── domains/
│   ├── user/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── aggregates/
│   │   └── repositories/
│   └── order/
│       ├── entities/
│       ├── value-objects/
│       └── services/
├── application/
│   ├── use-cases/
│   └── dto/
├── infrastructure/
│   ├── persistence/
│   └── external-services/
└── presentation/
    └── api/
```

## TypeScript Configuration

Fastay is TypeScript-first, so proper TypeScript configuration is crucial:

### Recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@middlewares/*": ["src/middlewares/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Path Aliases for Clean Imports

With the above configuration, you can use clean import paths:

```typescript
// Instead of relative paths
import { UserService } from "../../../services/user-service";

// Use path aliases
import { UserService } from "@services/user-service";
import { formatCurrency } from "@utils/formatters";
```

## Environment Configuration

Fastay follows the standard Node.js approach to environment configuration:

### `.env` File Structure

```
.env                    # Default environment (loaded first)
.env.local              # Local overrides (gitignored)
.env.development        # Development-specific
.env.production         # Production-specific
.env.test               # Test-specific
```

### Environment Variable Management

```typescript
// src/config/env.ts
import dotenv from "dotenv";
import path from "path";

// Load environment based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Always load .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Authentication
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // External APIs
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  sendgridApiKey: process.env.SENDGRID_API_KEY,

  // Feature flags
  enableCache: process.env.ENABLE_CACHE === "true",
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== "false",

  // Validation
  get isProduction() {
    return this.nodeEnv === "production";
  },

  get isDevelopment() {
    return this.nodeEnv === "development";
  },
};
```

## Testing Structure

Fastay doesn't enforce a testing structure, but here's a common pattern:

```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── middlewares/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── api/
└── fixtures/
    ├── users.ts
    └── products.ts
```

### Test File Naming Convention

- `*.test.ts` - Files that contain tests
- `*.spec.ts` - Alternative naming (same as .test.ts)
- `test-utils.ts` - Shared testing utilities

## Deployment Considerations

### Production Build Process

1. **Compile TypeScript**: `npm run build` creates `dist/` directory
2. **Install production dependencies**: `npm ci --production`
3. **Set environment variables**: Configure `.env.production`
4. **Run migrations**: If using a database
5. **Start the server**: `npm start`

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY fastay.config.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove source files (optional)
RUN rm -rf src

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
```

### Deployment Checklist

- [ ] Update `package.json` version
- [ ] Run tests: `npm test`
- [ ] Build production: `npm run build`
- [ ] Check environment variables
- [ ] Database migrations
- [ ] SSL certificates (for production)
- [ ] Monitoring setup
- [ ] Backup procedures

## Common File Structure Anti-Patterns

### ✗ Avoid: Monolithic Files

```typescript
// ✗ DON'T: One giant route file
// src/api/all-routes.ts (hundreds of lines)

// ✓ DO: Split by resource/feature
// src/api/users/route.ts
// src/api/products/route.ts
// src/api/orders/route.ts
```

### ✗ Avoid: Business Logic in Routes

```typescript
// ✗ DON'T: Database logic in routes
export async function POST(request: Request) {
  const data = await request.body;
  // Direct database calls mixed with HTTP logic
  const user = await prisma.user.create({ data });
  // Email logic here too
  await sendEmail(user.email);
  return { user };
}

// ✓ DO: Use services
export async function POST(request: Request) {
  const data = await request.body;
  const user = await userService.createUser(data);
  return { user };
}
```

### ✗ Avoid: Global State in Middleware

```typescript
// ✗ DON'T: Global mutable state
let requestCount = 0; // Shared across all requests!

export function logger(request, response, next) {
  requestCount++; // ✗ Race conditions!
  next();
}

// ✓ DO: Use request-specific or external storage
export function logger(request, response, next) {
  request.requestId = crypto.randomUUID(); // ✓ Request-specific
  next();
}
```

## Migration from Other Structures

If you're migrating from Express.js to Fastay:

### Express Structure → Fastay Structure

```
# Express (typical)
src/
├── routes/
│   ├── users.js
│   ├── products.js
│   └── orders.js
├── controllers/
├── models/
└── app.js

# Fastay (equivalent)
src/
├── api/
│   ├── users/
│   │   └── route.ts      # routes/users.js + controllers/users.js
│   ├── products/
│   │   └── route.ts
│   └── orders/
│       └── route.ts
├── services/             # Business logic (replaces some controller logic)
└── middlewares/          # Reusable middleware
```

## Customizing the Structure

While Fastay provides a recommended structure, you can customize it to fit your needs:

### Changing the API Directory

```typescript
// src/index.ts
await createApp({
  apiDir: "./src/routes", // Custom directory
  baseRoute: "/api/v1",
});
```

## Best Practices Summary

1. **Follow conventions**: Stick to Fastay's default structure when starting
2. **Keep routes thin**: Delegate business logic to services
3. **Use TypeScript features**: Interfaces, types, and path aliases
4. **Organize by feature**: As you scale, consider feature-based organization
5. **Separate concerns**: Clear separation between HTTP, business logic, and data access
6. **Consistent naming**: Use consistent file and directory naming
7. **Environment-aware**: Different configurations for dev/test/prod
8. **Document structure**: Keep a STRUCTURE.md file for large teams

Fastay's file structure is designed to grow with your application. Start with the simple conventions, and evolve the structure as your needs become more complex. The framework provides the right balance of guidance and flexibility to keep your project organized from prototype to production.
