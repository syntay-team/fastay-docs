---
title: "Authentication Guide"
---

# Authentication in Fastay: A Complete Guide

This guide will teach you everything you need to know about adding authentication to your Fastay application. We'll start simple and gradually build up to production-ready patterns. You don't need to be an authentication expert to follow along.

## What This Guide Covers

We'll take a progressive approach:

1. **Getting Started**: Understanding authentication in Fastay
2. **Simple JWT Authentication**: A working system without any database
3. **Adding a Database (Optional)**: Using Prisma or any ORM
4. **Advanced Features**: Refresh tokens, password reset, social login
5. **Production Considerations**: Security, deployment, monitoring

**Important**: Fastay doesn't require any specific authentication method or database. You can use what works best for your project.

## Quick Start: The Simplest Authentication

If you just need to get something working right now, here's the absolute minimum:

```typescript
// src/api/auth/login/route.ts
import { Request } from "@syntay/fastay";
import jwt from "jsonwebtoken";

// Simple in-memory user store (replace with database later)
const users = [{ id: "1", email: "user@example.com", password: "password123" }];

export async function POST(request: Request) {
  const { email, password } = await request.body;

  // Find user (very basic check)
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return {
      status: 401,
      body: { error: "Invalid credentials" },
    };
  }

  // Create a simple token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "1h" },
  );

  return {
    status: 200,
    body: {
      token,
      user: { id: user.id, email: user.email },
    },
  };
}
```

And the middleware to protect routes:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";
import jwt from "jsonwebtoken";

export async function authMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const token = request.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return response.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    request.user = decoded; // Attach user info to request
    next();
  } catch {
    return response.status(401).json({ error: "Invalid token" });
  }
}
```

That's it! You now have working authentication. Read on to learn how to improve and scale this system.

## Understanding Authentication in Fastay

Before we dive deeper, let's understand what authentication means in the context of Fastay.

### What is Authentication?

Authentication is answering the question: **"Who are you?"** It's different from authorization, which answers: **"What are you allowed to do?"**

In Fastay, authentication typically involves:

1. **Login endpoint**: Where users provide credentials
2. **Token generation**: Creating a secure token for the user
3. **Middleware**: Checking the token on protected routes
4. **User context**: Making user information available to your route handlers

### Fastay's Approach to Authentication

Fastay gives you flexibility. You can:

- Use JSON Web Tokens (JWT) or sessions
- Store users in a database or use external services
- Implement simple or complex authentication flows
- Choose your own security practices

The framework provides the structure (routes, middleware, TypeScript support) but doesn't lock you into specific authentication libraries or patterns.

## Part 1: Simple JWT Authentication (No Database)

Let's build a complete authentication system without any database. This is perfect for prototypes, simple apps, or when you want to understand the basics first.

### Step 1: Project Setup

First, install the only required dependency:

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

### Step 2: Configuration

Create a simple configuration file:

```typescript
// src/config/auth.ts
export const authConfig = {
  // Use environment variable in production
  jwtSecret: process.env.JWT_SECRET || "udffry897893h8f8jvhuyyojewiouruqiajih",

  // Token expiration (1 hour for development, 15 minutes for production)
  jwtExpiresIn: process.env.NODE_ENV === "production" ? "15m" : "1h",

  // Simple in-memory user store
  users: [
    {
      id: "1",
      email: "admin@example.com",
      password: "admin123", // In real apps, never store plain passwords
      role: "admin",
    },
    {
      id: "2",
      email: "user@example.com",
      password: "user123",
      role: "user",
    },
  ],
};
```

### Step 3: Login Route

Create a login endpoint that validates credentials and returns a token:

```typescript
// src/api/auth/login/route.ts
import { Request } from "@syntay/fastay";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.body;

    // Basic validation
    if (!email || !password) {
      return {
        status: 400,
        body: {
          error: "MISSING_CREDENTIALS",
          message: "Email and password are required",
        },
      };
    }

    // Find user (simple check for now)
    const user = authConfig.users.find(
      (u) => u.email === email && u.password === password,
    );

    if (!user) {
      // Return generic message to prevent user enumeration
      return {
        status: 401,
        body: {
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };
    }

    // Create token (don't include sensitive data)
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      authConfig.jwtSecret as string,
      { expiresIn: authConfig.jwtExpiresIn } as jwt.SignOptions,
    );

    // Return success (without password!)
    return {
      status: 200,
      body: {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      status: 500,
      body: {
        error: "LOGIN_FAILED",
        message: "Something went wrong",
      },
    };
  }
}
```

### Step 4: Authentication Middleware

Create middleware to protect your routes:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/auth";

// Tell TypeScript about our user property
declare module "@syntay/fastay" {
  interface Request {
    user?: {
      userId: string;
      role: string;
    };
  }
}

export async function authMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).json({
        error: "NO_TOKEN",
        message: "Authentication token is required",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verify the token
    const decoded = jwt.verify(token, authConfig.jwtSecret) as {
      userId: string;
      role: string;
      iat: number;
      exp: number;
    };

    // Attach user information to the request
    request.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    // Continue to the route handler
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({
        error: "TOKEN_EXPIRED",
        message: "Your session has expired. Please login again.",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return response.status(401).json({
        error: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }

    // Unknown error
    console.error("Auth middleware error:", error);
    return response.status(500).json({
      error: "AUTH_ERROR",
      message: "Authentication failed",
    });
  }
}

// Optional: Role-based middleware
export function requireRole(allowedRoles: string[]) {
  return function (request: Request, response: Response, next: Next) {
    if (!request.user) {
      return response.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to access this resource",
      });
    }

    next();
  };
}
```

### Step 5: Using the Middleware

Configure which routes need authentication:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";
import { authMiddleware, requireRole } from "./auth";

export const middleware = createMiddleware({
  // Public routes (no authentication needed)
  "/api/auth/": [], // Auth endpoints are public
  "/api/public/": [],
  "/api/health": [],

  // Protected routes
  "/api/profile": [authMiddleware],
  "/api/dashboard": [authMiddleware],
  "/api/admin/": [authMiddleware, requireRole(["admin"])],
});
```

### Step 6: Testing Your Authentication

Create a simple test route to verify everything works:

```typescript
// src/api/profile/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  // The auth middleware attached user info to the request
  const user = request.user;

  return {
    message: "Profile data",
    user,
    timestamp: new Date().toISOString(),
  };
}
```

### Step 7: Testing with an API Client

Use curl, Postman, or any HTTP client to test:

```bash
# Login to get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Use the token to access protected route
curl http://localhost:5000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Congratulations!** You now have a working authentication system. This is enough for many small applications. The rest of this guide will show you how to improve and scale this system.

## Part 2: Adding a Database (Optional)

The simple system above stores users in memory, which isn't suitable for production. Let's add a database. Fastay works with any database or ORM, but we'll show two approaches:

### Option A: Using Prisma (Recommended for TypeScript)

[Prisma](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres) is a modern TypeScript ORM that works well with Fastay. It's optional but recommended for type safety.

#### Installing Prisma and required dependencies

Install the packages needed for this guide:

```bash
npm install prisma @types/node @types/better-sqlite3 --save-dev
npm install @prisma/client @prisma/adapter-better-sqlite3 dotenv
npx prisma init
```

Here's what each package does:

- `prisma` - The Prisma CLI for running commands like prisma init, prisma migrate, and prisma generate
- `@prisma/client` - The Prisma Client library for querying your database
- `@prisma/adapter-better-sqlite3` - The SQLite driver adapter that connects Prisma Client to your database
- `@types/better-sqlite3` - TypeScript type definitions for better-sqlite3
- `dotenv` - Loads environment variables from your .env file

#### Creating a User Model

```prisma
// prisma/schema.prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite" // or mysql, sqlite, etc.
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // We'll hash this
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Optional fields for advanced features
  resetToken        String?
  resetTokenExpires DateTime?
  refreshToken      String?

  @@map("users")
}
```

### Creating the Prisma Client Instance

The database client is usually placed in `src/lib/database.ts` to clearly separate infrastructure concerns from business logic.

```typescript
// src/lib/database.ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
```

A `.env` file should be created with the following value:
.env

```env
DATABASE_URL="file:./dev.db
```

### **Create and Apply Your First Migration**

With the database connection configured and the Prisma schema defined, the next step is to **create the actual database tables**.

Prisma does **not** create tables automatically.
Instead, it uses **migrations** — versioned instructions that describe how your database structure evolves over time.

Execute the following command:

```bash
npx prisma migrate dev --name init
```

This command does several things at once:

- Reads your `schema.prisma`
- Creates a new migration file inside `prisma/migrations`
- Applies the migration to the database
- Updates Prisma’s internal migration history
- Automatically runs `prisma generate` (unless disabled)

In short:
**Your database tables are created here.**

#### **Generating the Prisma Client**

After the database schema is applied, you need to generate the **Prisma Client**, which is the typed API you use in your code.

If it wasn’t generated automatically, run:

```bash
npx prisma generate
```

This command:

- Reads `schema.prisma`
- Generates a fully typed client
- Places it in `generated/prisma/client` (or `node_modules` depending on config)

#### Updated Login with Database

This login endpoint now uses a real database instead of in-memory data.
User credentials are validated using **Prisma** for database access, **bcrypt** for password verification, and **JWT** for session authentication.

When a request is received, the API:

- Validates the email and password
- Looks up the user in the database
- Compares the hashed password
- Generates a JWT on success

Only non-sensitive user data is returned in the response.

```typescript
// src/api/auth/login/route.ts
import { Request } from "@syntay/fastay";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/database";
import { authConfig } from "@/config/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.body;

    // Input validation
    if (!email || !password) {
      return {
        status: 400,
        body: {
          error: "MISSING_CREDENTIALS",
          message: "Email and password are required",
        },
      };
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      return {
        status: 401,
        body: {
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };
    }

    // Verify password (we need to hash passwords when creating users)
    const isValidPassword = await bcrypt.compare(
      password as string,
      user.password as string,
    );

    if (!isValidPassword) {
      return {
        status: 401,
        body: {
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      authConfig.jwtSecret as string,
      { expiresIn: authConfig.jwtExpiresIn } as jwt.SignOptions,
    );

    // Return success
    return {
      status: 200,
      body: {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      status: 500,
      body: {
        error: "LOGIN_FAILED",
        message: "Something went wrong",
      },
    };
  }
}
```

#### Registration Endpoint

This endpoint handles new user registration. It validates required input, checks for existing accounts, securely hashes the password, and creates a new user in the database while returning only safe, public user information.

```typescript
// src/api/auth/register/route.ts
import { Request } from "@syntay/fastay";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.body;

    // Validation
    if (!email || !password) {
      return {
        status: 400,
        body: {
          error: "VALIDATION_ERROR",
          message: "Email and password are required",
        },
      };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        status: 409, // Conflict
        body: {
          error: "EMAIL_EXISTS",
          message: "Email already registered",
        },
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password as string, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "user",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      status: 201, // Created
      body: {
        message: "Registration successful",
        user,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      status: 500,
      body: {
        error: "REGISTRATION_FAILED",
        message: "Failed to create account",
      },
    };
  }
}
```

### Test the Authentication API (JWT + SQLite + Prisma)

To verify that the authentication system works end-to-end, follow this flow: register a new user via `POST /auth/register`, then log in using `POST /auth/login` to receive a JWT token. Finally, call the protected endpoint `/profile` with the token in the Authorization header (`Bearer token`). If the token is valid, the server returns the user profile; otherwise it returns `NO_TOKEN` or `INVALID_TOKEN`.

```bash
# 1) Register
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"admin123"}'

echo -e "\n\n"

# 2) Login and capture token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"admin123"}' \
  | jq -r '.token')

echo "TOKEN: $TOKEN"
echo -e "\n\n"

# 3) Call protected endpoint with token
curl -s http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n"
```

### Option B: Using Raw SQL or Another ORM

If you prefer not to use Prisma, Fastay works with any database library. Here's an example with `pg` (PostgreSQL):

```typescript
// src/lib/database.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Login with raw SQL
export async function loginWithSQL(email: string, password: string) {
  const result = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
```

**Key Point**: Fastay doesn't care about your database choice. Use what works for your team and project.

## Part 3: Advanced Authentication Features

Now that you have a basic system working, let's add features that make it production-ready.

### Refresh Tokens

Access tokens should expire quickly (15-30 minutes). Refresh tokens allow users to get new access tokens without logging in again.

```typescript
// src/services/token-service.ts
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/database";

export class TokenService {
  private accessTokenSecret = process.env.JWT_SECRET!;
  private refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;

  generateAccessToken(userId: string, role: string) {
    return jwt.sign({ userId, role, type: "access" }, this.accessTokenSecret, {
      expiresIn: "15m",
    });
  }

  async generateRefreshToken(userId: string) {
    const refreshToken = jwt.sign(
      { userId, type: "refresh" },
      this.refreshTokenSecret,
      { expiresIn: "7d" },
    );

    // Store in database (allows invalidation)
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return refreshToken;
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      // Check if token exists in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, refreshToken },
      });

      if (!user) {
        throw new Error("Token revoked");
      }

      // Generate new access token
      return this.generateAccessToken(user.id, user.role);
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }
}
```

### Password Reset Flow

```typescript
// src/api/auth/reset-password/request/route.ts
import { Request } from "@syntay/fastay";
import crypto from "crypto";
import { prisma } from "@/lib/database";
import { sendEmail } from "@/services/email";

export async function POST(request: Request) {
  const { email } = await request.body;

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

  // Store token (don't reveal if user exists)
  await prisma.user.updateMany({
    where: { email },
    data: {
      resetToken,
      resetTokenExpires,
    },
  });

  // Send email (in production)
  if (process.env.NODE_ENV === "production") {
    await sendEmail({
      to: email,
      subject: "Password Reset",
      text: `Use this token to reset your password: ${resetToken}`,
    });
  }

  return {
    status: 200,
    body: {
      message: "If an account exists, you will receive reset instructions",
    },
  };
}
```

### Logout Endpoint

```typescript
// src/api/auth/logout/route.ts
import { Request } from "@syntay/fastay";
import { prisma } from "@/lib/database";

export async function POST(request: Request) {
  const userId = request.user?.userId;

  if (userId) {
    // Invalidate refresh token
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  return {
    status: 200,
    body: {
      message: "Logged out successfully",
    },
  };
}
```

## Part 4: Security Best Practices

### 1. Use Environment Variables

Never hardcode secrets. Use `.env` files:

```env
# .env.local
JWT_SECRET=your-super-secret-key-change-in-production
REFRESH_TOKEN_SECRET=another-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 2. Password Security

- Always hash passwords with bcrypt
- Require strong passwords (min length, mixed characters)
- Consider using a password strength library

### 3. Token Security

- Use short expiration for access tokens
- Store refresh tokens securely (HTTP-only cookies)
- Implement token rotation
- Blacklist tokens when needed

### 4. Rate Limiting

Prevent brute force attacks:

```typescript
// src/middlewares/rate-limit.ts
import { Request, Response, Next } from "@syntay/fastay";

const attempts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return function (request: Request, response: Response, next: Next) {
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();

    let record = attempts.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else if (record.count >= maxAttempts) {
      return response.status(429).json({
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many attempts, please try again later",
      });
    } else {
      record.count++;
    }

    attempts.set(key, record);
    next();
  };
}
```

### 5. CORS Configuration

Configure CORS properly for your frontend:

```typescript
// src/index.ts
await createApp({
  // ... other config
  expressOptions: {
    enableCors: {
      allowAnyOrigin: process.env.NODE_ENV === "development",
      cookieOrigins: ["https://your-frontend.com"],
      credentials: true,
      methods: "GET,POST,PUT,DELETE",
      headers: "Content-Type, Authorization",
    },
  },
});
```

## Part 5: Testing Authentication

Testing is crucial for authentication. Here's a simple test pattern:

```typescript
// tests/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp } from "./test-utils";
import { prisma } from "@/lib/database";

describe("Authentication", () => {
  let testApp: any;
  let authToken: string;

  beforeAll(async () => {
    testApp = await createTestApp();

    // Create test user
    await prisma.user.create({
      data: {
        email: "test@example.com",
        password: await bcrypt.hash("test123", 10),
        role: "user",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
  });

  it("should login with valid credentials", async () => {
    const response = await testApp.post("/api/auth/login").send({
      email: "test@example.com",
      password: "test123",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    authToken = response.body.token;
  });

  it("should access protected route with token", async () => {
    const response = await testApp
      .get("/api/profile")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });

  it("should reject request without token", async () => {
    const response = await testApp.get("/api/profile");
    expect(response.status).toBe(401);
  });
});
```

## Common Questions & Answers

### Q: Do I need Prisma?

**A**: No. Fastay works with any database or no database at all. Prisma is convenient for TypeScript projects, but you can use raw SQL, Mongoose, TypeORM, or any other library.

### Q: How do I handle social login (Google, GitHub)?

**A**: Use OAuth libraries like `passport` or handle the OAuth flow manually. Fastay's route handlers can work with any OAuth provider.

### Q: Should I use cookies or Authorization header?

**A**: For web apps, HTTP-only cookies are more secure against XSS. For mobile/native apps, use the Authorization header. Fastay supports both.

### Q: How do I implement 2FA?

**A**: Use libraries like `speakeasy` for TOTP codes. Store the 2FA secret in the user's record and require it during login after password verification.

### Q: Can I use sessions instead of JWT?

**A**: Yes. Fastay is built on Express, so you can use `express-session` or any session middleware.

## Summary: Your Authentication Journey

Here's what you've learned:

1. **Basic JWT Authentication**: Enough for prototypes and small apps
2. **Database Integration**: How to add Prisma or any database
3. **Advanced Features**: Refresh tokens, password reset, security
4. **Production Considerations**: Rate limiting, CORS, testing

### Where to Go From Here

Based on your needs:

- **Simple app**: Use Part 1 with environment variables
- **Production app**: Use Part 2 with database + Part 4 security
- **Enterprise app**: Add all advanced features + monitoring

### Final Checklist Before Production

- [ ] Use environment variables for all secrets
- [ ] Set up HTTPS (required for production)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add proper CORS configuration
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Write tests for authentication flows
- [ ] Document your API authentication method

Remember: Start simple and add complexity as needed. The basic JWT authentication from Part 1 is enough for many applications. Only add database, refresh tokens, and other features when you actually need them.

Fastay gives you the flexibility to build the authentication system that fits your project, without forcing you into a specific pattern. Use this guide as a reference, but adapt it to your specific requirements.
