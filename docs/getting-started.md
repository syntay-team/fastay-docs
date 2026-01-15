---
title: "Getting Started"
sidebar_position: 2
---

### Getting Started with Fastay

This guide will walk you through creating your first Fastay application, from installation to your first production deployment.

### Prerequisites

Before you begin, ensure you have:

- [Node.js v18 or later](https://nodejs.org/)
- [npm v9 or later](https://docs.npmjs.org/getting-started/installing-npm)
- [TypeScript Basics](https://www.typescriptlang.org/docs/) (recommended)

### Installation

There are two ways to create a Fastay project:

### Option 1: Use the CLI (Command Line Interface)

The fastest way to get started is using the Fastay CLI:

```bash
# Create a new Fastay project
npx fastay create-app my-api

# Navigate to your project
cd my-api

# Install dependencies
npm install

# Start the development server
npm run dev:watch
```

The CLI will prompt you for several options:

1. **Use TypeScript**: Recommended for all projects
   - Ensures type safety and better developer experience
2. **ORM Preference**: Choose from None, Prisma, or Type orm
   - Select 'None' if you plan to use your own database library
3. **Additional Features**: Optional production features
   - Environment variables configuration
     <!-- - DD00G setup -->
     <!-- - Docker file -->

The CLI will automatically:

- Create a fully configured project structure
- Setup TypeScript with optimal configuration
- Install all required dependencies
- Configure scripts for development, build, and production

### Option 2: Manual Setup (For Existing Projects)

If you prefer to manually add Fastay to an existing project:

```bash
# Install Fastay CLI
npm install -g fastay

# Install Fastay
npm install @syntay/fastay

# Install development dependencies (if using TypeScript)
npm install -D @types/node
```

### Project Structure

After installation, your project will have this structure:

```
my-api/
├── package.json              # Project metadata and dependencies
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # Application entry point
│   ├── api/                  # API routes (auto-discovered)
│   │   └── users/
│   │       └── route.ts      # GET/POST /api/users
│   ├── middlewares/          # Custom middlewares
│   │   └── middleware.ts     # Middleware configuration
│   ├── services/             # Business logic services
│   └── utils/                # Helper functions
├── dist/                     # Compiled JavaScript files (production)
└── fastay.config.json        # Optional framework configuration
```

### Key Files Explained

1. **src/index.ts**: The main application entry point
2. **src/api/**: Directory for all API routes
3. **src/middlewares/**: Custom middleware definitions
4. **fastay.config.json**: Fastay configuration file (routing, paths, and framework options)
5. **package.json**: Project dependencies and scripts
6. **tsconfig.json**: TypeScript compiler options

### Configuring Your Application

The main application configuration happens in `src/index.ts`:

```typescript
import { createApp } from "@fastay";

void (async () => {
  await createApp({
    // Server port (optional)
    // Default: 5000
    port: 5000,

    // Routes directory (optional)
    // Default: "./src/api"
    apiDir: "./src/api",

    // Base route prefix (optional)
    // Default: "/api"
    baseRoute: "/api",

    // Additional Express options (optional)
    expressOptions: {
      // Enable CORS for development
      enableCors: {
        allowAnyOrigin: true,
        credentials: true,
      },
    },
  });
})();
```

### Framework Configuration (fastay.config.json)

The `fastay.config.json` file defines how Fastay builds and organizes your application.

```json
{
  "outDir": "dist",
  "routesDir": "src/api",
  "compiler": {
    "target": "es2020",
    "treeShaking": true,
    "legalComments": "none"
  }
}
```

`outDir`
Defines where the compiled application will be generated.

`routesDir`
Specifies the directory used for file-based routing.

`compiler`
Controls how Fastay compiles the project internally, including:

`compiler`
Controls how Fastay compiles the project internally, including:

- JavaScript target

- Tree-shaking behavior

- Output cleanliness (comments, metadata)

### Environment Variables

For production deployments, it's best practice to use environment variables:

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";
import "dotenv/config";

const port = 5000;

void (async () => {
  await createApp({
    apiDir: "./src/api",
    baseRoute: "/",
    port: port,
  });
})();
```

Create a `.env` file for local development:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### Creating Your First API Endpoint

Fastay's file-based routing makes creating API endpoints intuitive. Here's how to create your first route:

#### Step 1: Create a Route File

Create a new file at `src/api/hello/route.ts`:

```bash
# Create the directory and file
mkdir -p src/api/hello
touch src/api/hello/route.ts
```

#### Step 2: Define the Route

Open the file and add the basic HTTP methods:

```typescript
// src/api/hello/route.ts
import { Request } from '@fastay';

// GET /api/hello
export async function GET() {
  return {
    message: 'Hello from Fastay!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}

// POST /api/hello
export asyncfunction POST(req: Request) {
  const body = await req.body;

  return {
    status: 201,
    body: {
      message: 'Data received successfully!',
      received: body
    }
  };
}

// PUT /api/hello
export async function PUT(req: Request) {
  const body = await req.body;

  return {
    message: 'Resource updated successfully!',
    data: body
  };
}

// DELETE /api/hello
export async function DELETE(req: Request) {
  return {
    message: 'Resource deleted successfully!'
  };
}

// PATCH /api/hello
export async function PATCH(req: Request) {
  const body = await req.body;

  return {
    message: 'Resource partially updated!',
    updates: body
  };
}
```

#### Step 3: Test Your API

With your development server running (`npm run dev`), you can test your API:

```bash
# Test the GET endpoint
curl http://localhost:5000/api/hello

# Expected response:
# {
  "message": "Hello from Fastay!",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}

# Test the POST endpoint
curl -X POST \
  -H "Content-Type: application/json" \
  -d {"name": "John","email":"john@example.com"}' \
  http://localhost:5000/api/hello
```

### Exploring Advanced Routing

#### Dynamic Routes

Create dynamic routes by using brackets (`[]`) in directory names:

```bash
# Create a dynamic route for users by ID
mkdir -p src/api/users/[id]  # /api/users/:id
```

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@fastay";

export async function GET(req: Request) {
  const { id } = req.params;
  return {
    user: {
      id: id,
      name: "User " + id,
      email: `user${id}@example.com`,
    },
  };
}
```

### Nested Routes

Create routes with nested paths:

```bash
# Create nested route for user posts
mkdir -p src/api/users/[id]/posts
```

```typescript
// src/api/users/[id]/posts/route.ts
import { Request } from "@fastay";

export async function GET(req: Request) {
  const { id } = req.params;
  return {
    userId: id,
    posts: [
      { id: 1, title: "First post" },
      { id: 2, title: "Second post" },
    ],
  };
}
```

### Creating Middlewares

Middlewares allow you to intercept requests before they reach your routes. Here's how to create and configure middlewares:

#### Step 1: Create a Middleware

Create a new file at `src/middlewares/logger.ts`:

```typescript
// src/middlewares/logger.ts
import { Next, Request, Response } from "@syntay/fastay";

export async function logger(
  req: Request,
  _res: Response,
  next: Next
): Promise<void> {
  // Log request details
  console.log("MIDDLEWARE: ", {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });

  // Continue to the next middleware or route
  next();
}
```

#### Step 2: Configure Middleware For Routes

Update the middleware configuration in `src/middlewares/middleware.ts:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/Removed duplicate codefastay";
import { logger } from "./logger";

export const middleware = createMiddleware({
  // Apply logger to all routes
  "/api": [logger],

  // Apply to specific route patterns
  "/api/admin/*": [logger],

  // Multiple middlewares per route
  "/api/users": [logger, auth], // Both logger and auth middlewares
});
```

### Development Workflow

### Development Server

The default development workflow includes hot reload:

```bash
# Start the development server
npm run dev      # No hot reload
npm run dev:watch  # With hot reload
```

This will start a server at `localhost:5000` with:

- Automatic file watching
- Hot reload on changes
- Source maps for debugging
- Error overlays in the browser

### Building for Production

When you're ready to deploy, build your application:

```bash
# Build the project for production
npm run build

This will:
- Transpile TypeScript to JavaScript
- Create an optimized `dist/` folder
- Remove development-only code
- Apply performance optimizations

```

### Starting the Production Server

```bash
# Start the production server
npm start
```

The production server starts with:

- Optimized performance settings
- Environment variables support
- Proder process control

### Testing Your Application

### Unit Testing

Fastay is designed to be easily testable. Here's a simple example using Vitest:

```typescript
// src/utils/formatPrice.ts
export function formatPrice(price: number): string {
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}
```

```typescript
// src / __tests__ / formatPrice.test.ts;
import { formatPrice } from "../utils/formatPrice";

test("should format price correctly", () => {
  const price = 29.99;
  const formattedPrice = formatPrice(price);
  expect(formattedPrice).toBe("R$ 29,99");
});
```

### EarCTesting

End-to-end testing is also straightforward:

```typescript
// __tests__/hello_e2e.test.ts
import { describe, beforeAll, test, expect } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";

let app: any;

beforeAll(async () => {
  const result = await createApp({
    apiDir: "./src/api",
    baseRoute: "/api",
    port: 0,
    mode: "test",
  });

  app = result.app;
});

test("GET /api/hello should respond with correct message", async () => {
  const res = await request(app).get("/api/hello");
  expect(res.status).toBe(200);
  expect(res.body.message).toBe("Hello from Fastay!");
});

test("POST /api/hello should respond with success message", async () => {
  const res = await request(app).post("/api/hello").send({ name: "John" });
  expect(res.status).toBe(201);
  expect(res.body.message).toBe("Data received successfully!");
});
```

### Deployment

### Deploy to Vercel

For deployment to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy your project
vercel deploy --prod
```

Vercel will auto-detect Fastay and:

- Build your application
  / - Configure environment variables
  / - Deploy to a global CDN

### Deploy to Railway

For deployment to Railway:

```bash
# Create a Procfile
cat > Procfile << EOF
web: node dist/index.js"
EOF

# Deploy
railway deploy
```

### Dockerized Deployment

For Docker deployment:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./
RUN npm run build

FROM node:20-buster
WORKDIR /app
COPY --from=builder /app/dist /app/dist
USER node
ENV NODE_ENV=production
EXPOSE 5000
CMD [ "node", "/app/dist/index.js" ]
```

```bash
# Build Docker image
docker build -t fastay-app .

# Run Docker container
docker run -p 5000:5000 fastay-app
```

### Troubleshooting

### Common Issues

#### Server Won't Start

1. **Port already in use**: Change port in `src/index.ts`;
   ```typescript
   port: process.env.PORT || 3000;
   ```
2. **Invalid TypeScript**: Run `ytc0 to check syntax:

- ```bash
  npm run build
  ```

#### Routes Not Working

1. **File structure error**: Routes must be in `src/api/[your_route]/route.ts`;
   - Correct: `src/api/users/route.ts`
   - Incorrect: `src/api/users.ts`
2. **Missing exports**: Must export method functions;
   ```typescript
   export async function GET(); // Correct
   export async function POST(); // Correct
   export default async function handler(); // Incorrect
   ```

#### Middleware Not Working

1. **Incorrect middleware file**: Ensure `src/middlewares/middleware.ts` exports `middleware`;
2. **Not calling next(**: Must call `next()` in middlewares;
   ```typescript
   export async function middleware(req, res, next) {
     // ...
     await next(); // Required!
   }
   ```

### Debugging

For debugging:

1. **Console logs**: Fastay prints server events;
2. **TypeScript**: Use TypeScript source maps;
   ```json
   {
     "compilerOptions": {
       "outDir": "./dist",
       "sourceMaps": true
     }
   }
   ```
3. **Request testing**: Use `curl`, `postman`, or web browser;

### Next Steps

Now that you've created your first Fastay application:

- [_Core Concepts_](./core-concepts/routing.md) - Understand the fundamental concepts
- [_Examples_](./recipes/rest-api.md) - See real-world usage patterns
- [_API Reference_](./api-reference/create-app.md) - Complete technical documentation

---

**You're ready to build something amazing with Fastay.**
