---
title: "Introduction"
---

### Fastay: Backend Framework with File-based Routing

Fastay is a TypeScript-first backend framework designed for developers who value simplicity, productivity, and modern development practices. Built on the solid foundation of Express.js, Fastay introduces intelligent conventions and a file-based routing system that eliminates boilerplate code while maintaining full flexibility.

### The Philosophy of Intentional Simplicity

Fastay is built on the principle that backend development should be straightforward, predictable, and efficient. We believe that frameworks should:

- **Accelerate development** without compromising control
- **Provide sensible defaults** that work out of the box
- **Respect developer intuition** with intuitive APIs
- **Scale elegantly** from prototypes to production systems

### Core Design Principles

#### 1. File-Based Architecture

Routes are organized as files in your project structure. Each `route.ts` file automatically becomes an API endpoint, eliminating the need for manual route registration and providing a clear, predictable structure.

#### 2. Zero-Configuration Start

Fastay works immediately with sensible defaults. You can create a fully functional API without editing a single configuration file, while maintaining the ability to customize every aspect when needed.

#### 3. TypeScript by Design

From ground up, Fastay is built with TypeScript. You get full type safety, intelligent code completion, and modern JavaScript features without any additional setup.

#### 4. Express Compatibility

While providing its own elegant API, Fastay maintains full compatibility with the Express.js ecosystem. You can use any Express middleware, follow Express patterns, and leverage the vast npm ecosystem.

#### 5. Production Ready

Security, error handling, performance optimizations, and deployment tooling are built-in, not afterthoughts. Fastay applications are ready for production from day one.

### What Makes Fastay Different?

#### Against Pure Express.js

While Express.js provides maximum flexibility, it requires significant boilerplate code and manual configuration for real-world applications. Fastay provides the same flexibility with intelligent conventions that reduce repetitive code by up to 70%.

#### Against Heavyweight Frameworks

Frameworks like NestJS provide excellent structure but come with a steep learning curve and significant configuration overhead. Fastay offers similar productivity benefits with a much gentler learning curve and minimal configuration.

#### The Fastay Approach

Fastay finds the optimal balance between flexibility and structure. It provides just enough convention to accelerate development while leaving you in complete control of your application architecture.

### Key Features at a Glance

#### Intelligent Routing System

```typescript
// src/api/users/route.ts automatically becomes GET/POST /api/users
export async function GET() {
  return { users: await db.users.findMany() };
}

// src/api/users/[id]/route.ts becomes GET/PUT/DELETE /api/users/:id
import { Request } from "@syntay/fastay";

export async function GET(req: Request) {
  const { id } = req.params;
  return { user: await db.users.findUnique({ where: { id } }) };
}
```

#### Middleware System with Precision

Apply middleware to specific routes or route patterns with a clean, declarative API:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";

export const middleware = createMiddleware({
  "/api/admin": [requireAuth, requireAdmin],
  "/api/users": [requireAuth],
  "/api/public": [rateLimit],
});
```

#### Rich Response System

Handle all HTTP response types with a consistent, type-safe API:

```typescript
import { Request } from "@syntay/fastay";

export async function POST(req: Request) {
  // JSON responses
  return { data: result };

  // With custom status
  return { status: 201, body: { created: true } };

  // With cookies
  return {
    cookies: {
      session: { value: token, options: { httpOnly: true } },
    },
    body: { authenticated: true },
  };

  // File downloads
  return { file: { path: "/exports/data.csv" } };
}
```

#### Full TypeScript Support

Every aspect of Fastay is fully typed, providing excellent developer experience with intelligent code completion and compile-time safety:

```typescript
import { Request } from "@syntay/fastay";

// TypeScript knows the structure of Request
export async function GET(req: Request) {
  // req.params is typed
  const { id } = req.params; // string

  // req.query is typed
  const { page } = req.query; // string | undefined

  // req.body is typed
  const userData = await req.body; // any (use validation for types)
}
```

### When to Choose Fastay

Fastay is particularly well-uited for:

#### Rapid Prototyping

Create functional APIs in minutes for proof-of-concepts, MVPs, or hackathons.

#### Microservices Architecture

Build focused, single-responsibility services with minimal overhead.

#### RESTFul APIs

Develop clean, well-structured REST APIs with automatic route discovery.

#### Full-Stack Applications

Pair with frontend frameworks like React, Vue, or Angular for complete applications.

#### Legacy Express Modernization

Gradually modernize existing Express applications with TypeScript and better structure.

### Project Structure Overview

A typical Fastay project follows this intuitive structure:

```
my-api/
│
├── dist/           # Compiled production code
├── src/
│   ├── api/        # API routes (auto-loaded)
│   │   ├── hello/
│   │   │   └── route.ts
│   │   ├── users/
│   │   │   └── route.ts
│   │   └── products/
│   │       └── route.ts
│   │
│   ├── middlewares/ # Fastay middlewares
│   │   ├── auth.ts
│   │   ├── logger.ts
│   │   └── middleware.ts
│   │
│   ├── services/   # Business logic (recommended)
│   │   ├── user-service.ts
│   │   └── product-service.ts
│   │
│   ├── utils/      # Helper functions
│   │   └── formatters.ts
│   │
│   └── index.ts    # Application entry point
│
├── fastay.config.json # Global framework configuration
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

### Getting Started

The fastest way to experience Fastay is to create a new project:

```bash
npx fastay create-app my-api
cd my-api
npm run dev
```

In under 60 seconds, you'll have a running API server with:

- TypeScript configured and ready
- Hot reload for development
- File-based routing system
- Production-ready defaults

### Next Steps

- [_Getting Started_](./getting-started.md) - Create your first Fastay project
- [_Core Concepts_](./core-concepts/routing.md) - Understand the fundamental concepts
- [_Examples_](./recipes/rest-api.md) - See real-world usage patterns
- [_API Reference_](./api-reference/create-app.md) - Complete technical documentation

### Community and Support

Fastay is open source and actively maintained. Join our community:

- [GitHub Repository](https://github.com/syntay-team/fastay) - Report issues, suggest features, contribute code
- [Documentation](/) - Complete API reference and guides
- [Examples](/examples) - Practical examples and best practices

### License

Fastay is released under the MIT License. See the [LICENSE](https://github.com/syntay-team/fastay/blob/main/LICENSE) file for details.

---

_*Ready to build something amazing?*_ Fastay provides the tools and conventions to help you focus on what matters most: building great applications.
