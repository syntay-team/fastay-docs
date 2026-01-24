---
title: "Security"
---

# Security in Fastay Applications

Security is not an optional feature in web applications—it's a fundamental requirement. Fastay applications, like any web service, must protect against common threats while ensuring data privacy and system integrity. This guide covers essential security practices tailored to Fastay's architecture.

## Understanding Fastay's Security Model

Fastay builds on Express.js, inheriting its security characteristics while adding structure through file-based routing and middleware patterns. Security in Fastay requires both framework-level configuration and application-level implementation:

- **Framework security**: HTTPS, headers, and Express.js security middleware
- **Application security**: Authentication, authorization, input validation, and business logic
- **Data security**: Database protection, encryption, and secure transmission
- **Infrastructure security**: Deployment considerations and runtime protection

Security must be implemented at every layer, from the network to the database.

## Authentication and Authorization

### JWT Authentication Implementation

JSON Web Tokens (JWT) provide a stateless authentication mechanism suitable for Fastay APIs:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function jwtAuth(
  request: Request,
  response: Response,
  next: Next,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({
      error: "Authentication required",
      code: "NO_TOKEN",
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      exp: number;
    };

    // Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      return response.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    // Attach user to request
    request.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return response.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
}

// Token generation utility
export function generateToken(userId: string, role: string) {
  return jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    JWT_SECRET,
  );
}
```

### Session-Based Authentication

For applications requiring server-side session state:

```typescript
// src/middlewares/sessionAuth.ts
import { Request, Response, Next } from "@syntay/fastay";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";

// Configure Redis session store
const redisClient = new Redis(process.env.REDIS_URL);
const redisStore = new RedisStore({ client: redisClient });

export const sessionMiddleware = session({
  store: redisStore,
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

export async function sessionAuth(
  request: Request,
  response: Response,
  next: Next,
) {
  if (!request.session?.userId) {
    return response.status(401).json({
      error: "Authentication required",
      code: "NO_SESSION",
    });
  }

  // Load user from database
  const user = await db.user.findUnique({
    where: { id: request.session.userId },
  });

  if (!user || !user.active) {
    return response.status(401).json({
      error: "Invalid session",
      code: "INVALID_SESSION",
    });
  }

  request.user = user;
  next();
}
```

### Role-Based Access Control (RBAC)

Implement authorization based on user roles:

```typescript
// src/middlewares/rbac.ts
import { Request, Response, Next } from "@syntay/fastay";

export function requireRole(allowedRoles: string[]) {
  return async function (request: Request, response: Response, next: Next) {
    if (!request.user) {
      return response.status(401).json({
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        error: "Insufficient permissions",
        requiredRoles: allowedRoles,
        userRole: request.user.role,
      });
    }

    next();
  };
}

// Usage in middleware configuration
export const middleware = createMiddleware({
  "/api/admin": [jwtAuth, requireRole(["admin", "superadmin"])],
  "/api/manage": [jwtAuth, requireRole(["manager", "admin", "superadmin"])],
  "/api/user": [
    jwtAuth,
    requireRole(["user", "manager", "admin", "superadmin"]),
  ],
});
```

## Input Validation and Sanitization

### Schema-Based Validation with Zod

Validate and sanitize all incoming data:

```typescript
// src/middlewares/validate.ts
import { Request, Response, Next } from "@syntay/fastay";
import { z } from "zod";

export function validate(schema: z.ZodSchema) {
  return async function (request: Request, response: Response, next: Next) {
    try {
      // Parse and validate request body
      const validatedData = schema.parse(await request.body);

      // Sanitize string inputs
      const sanitizedData = sanitizeObject(validatedData);

      // Store sanitized data on request
      request.validatedData = sanitizedData;

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
      next(error);
    }
  };
}

// Sanitization helper
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    // Basic HTML sanitization
    return obj.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Example schema for user registration
export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z\s\-']+$/),
});
```

### SQL Injection Prevention

Prevent SQL injection through proper query construction:

```typescript
// Using Prisma (parameterized queries are automatic)
export async function searchUsers(query: string) {
  // Safe - Prisma handles parameterization
  return db.user.findMany({
    where: {
      OR: [{ name: { contains: query } }, { email: { contains: query } }],
    },
  });
}

// Using raw queries - ALWAYS use parameterization
export async function rawSearchUsers(query: string) {
  // UNSAFE - DO NOT DO THIS
  // return db.$queryRaw(`SELECT * FROM users WHERE name LIKE '%${query}%'`)

  // SAFE - Use parameterized queries
  return db.$queryRaw(`SELECT * FROM users WHERE name LIKE $1`, `%${query}%`);
}
```

### Cross-Site Scripting (XSS) Protection

Protect against XSS attacks:

```typescript
// src/middlewares/securityHeaders.ts
import { Request, Response, Next } from "@syntay/fastay";
import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      // Report violations (optional)
      reportUri: "/api/security/report",
    },
  },
  xssFilter: true, // Enable XSS filter
  noSniff: true, // Prevent MIME type sniffing
  frameguard: { action: "deny" }, // Prevent clickjacking
});
```

## Rate Limiting and Brute Force Protection

### API Rate Limiting

Protect against abuse and DoS attacks:

```typescript
// src/middlewares/rateLimit.ts
import { Request, Response, Next } from "@syntay/fastay";

// In-memory store (use Redis for distributed applications)
const requestCounts = new Map<
  string,
  {
    count: number;
    resetTime: number;
    blockedUntil?: number;
  }
>();

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  blockDuration?: number;
}) {
  return async function (request: Request, response: Response, next: Next) {
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();

    let record = requestCounts.get(key);

    // Check if IP is blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      response.setHeader("Retry-After", retryAfter);
      return response.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    // Reset counter if window expired
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
    } else if (record.count < options.maxRequests) {
      record.count++;
    } else {
      // Exceeded limit - block if configured
      if (options.blockDuration) {
        record.blockedUntil = now + options.blockDuration;
      }

      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      response.setHeader("Retry-After", retryAfter);
      return response.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    requestCounts.set(key, record);

    // Set rate limit headers
    response.setHeader("X-RateLimit-Limit", options.maxRequests);
    response.setHeader(
      "X-RateLimit-Remaining",
      options.maxRequests - record.count,
    );
    response.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    next();
  };
}

// Special rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  blockDuration: 30 * 60 * 1000, // Block for 30 minutes after exceeding
});
```

## Secure Configuration and Secrets Management

### Environment Variables

Never hardcode sensitive values:

```typescript
// src/config/env.ts
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required variables
const required = ["JWT_SECRET", "DATABASE_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || "5000"),
  nodeEnv: process.env.NODE_ENV || "development",

  // Security
  jwtSecret: process.env.JWT_SECRET!,
  sessionSecret: process.env.SESSION_SECRET!,

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // External services
  redisUrl: process.env.REDIS_URL,

  // Feature flags
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== "false",
  enableCors: process.env.ENABLE_CORS === "true",

  // Validation
  get isProduction() {
    return this.nodeEnv === "production";
  },

  get isDevelopment() {
    return this.nodeEnv === "development";
  },
};
```

### Secrets Rotation

Implement secrets rotation in production:

```typescript
// src/utils/secrets.ts
export class SecretManager {
  private currentSecret: string;
  private previousSecret: string | null = null;

  constructor() {
    this.currentSecret = process.env.JWT_SECRET!;

    // In production, fetch from secure storage
    if (process.env.NODE_ENV === "production") {
      this.initializeFromVault();
    }
  }

  async rotateSecret() {
    // Keep old secret for grace period
    this.previousSecret = this.currentSecret;

    // Generate new secret
    this.currentSecret = crypto.randomBytes(64).toString("hex");

    // Update in secure storage
    await this.updateVault(this.currentSecret);

    // Tokens signed with old secret will be invalid after grace period
    setTimeout(
      () => {
        this.previousSecret = null;
      },
      24 * 60 * 60 * 1000,
    ); // 24 hour grace period
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, this.currentSecret);
    } catch (error) {
      // Try with previous secret during grace period
      if (this.previousSecret) {
        return jwt.verify(token, this.previousSecret);
      }
      throw error;
    }
  }
}
```

## HTTPS and Transport Security

### Force HTTPS in Production

```typescript
// src/middlewares/forceHttps.ts
import { Request, Response, Next } from "@syntay/fastay";

export function forceHttps(request: Request, response: Response, next: Next) {
  // Skip in development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Check protocol
  if (request.headers["x-forwarded-proto"] !== "https") {
    return response.redirect(`https://${request.headers.host}${request.url}`);
  }

  // Set HSTS header
  response.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  next();
}
```

## Logging and Monitoring for Security

### Security Event Logging

Log security-relevant events:

```typescript
// src/middlewares/securityLogger.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function securityLogger(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  response.on("finish", () => {
    const securityEvents = [];

    // Detect potential attacks
    if (response.statusCode === 401 || response.statusCode === 403) {
      securityEvents.push("AUTH_FAILURE");
    }

    if (response.statusCode === 429) {
      securityEvents.push("RATE_LIMIT");
    }

    if (response.statusCode === 400 && request.path.includes("/api/auth")) {
      securityEvents.push("INVALID_INPUT_AUTH");
    }

    // Log security events
    if (securityEvents.length > 0) {
      console.warn({
        level: "warn",
        type: "SECURITY_EVENT",
        events: securityEvents,
        ip: request.ip,
        path: request.path,
        method: request.method,
        userAgent: request.get("user-agent"),
        timestamp: new Date().toISOString(),
      });
    }
  });

  next();
}
```

## Security Testing

### Automated Security Testing

Implement security tests:

```typescript
// tests/security/auth.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";

describe("Authentication Security", () => {
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

  it("should reject requests without authentication", async () => {
    const response = await request(app).get("/api/protected/data").expect(401);

    expect(response.body.error).toBeDefined();
  });

  it("should reject invalid JWT tokens", async () => {
    const response = await request(app)
      .get("/api/protected/data")
      .set("Authorization", "Bearer invalid.token.here")
      .expect(401);

    expect(response.body.error).toBe("Invalid token");
  });

  it("should prevent SQL injection in search", async () => {
    const response = await request(app)
      .get("/api/users/search")
      .query({ q: "' OR '1'='1" })
      .expect(400); // Should be caught by validation

    expect(response.status).not.toBe(500); // Should not cause server error
  });
});
```

## Security Headers Configuration

Configure comprehensive security headers:

```typescript
// In your Fastay application configuration
await createApp({
  expressOptions: {
    middlewares: [
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: { action: "deny" },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        xssFilter: true,
        noSniff: true,
      }),
    ],
  },
});
```

## Security Checklist for Fastay Applications

Before deploying to production:

- [ ] **Authentication**: All protected routes require authentication
- [ ] **Authorization**: Role-based access control implemented
- [ ] **Input validation**: All inputs validated and sanitized
- [ ] **HTTPS**: SSL/TLS enabled with proper certificates
- [ ] **Security headers**: CSP, HSTS, XSS protection configured
- [ ] **Rate limiting**: Protection against brute force and DoS
- [ ] **SQL injection**: Parameterized queries used exclusively
- [ ] **XSS protection**: Output encoding and content security policy
- [ ] **Secrets management**: No hardcoded secrets, environment variables used
- [ ] **Dependencies**: Regular security updates for all packages
- [ ] **Logging**: Security events logged and monitored
- [ ] **Error handling**: No sensitive information in error responses
- [ ] **CORS**: Properly configured for your frontend domains
- [ ] **Session security**: Secure, HTTP-only cookies with proper expiration

Security is an ongoing process, not a one-time configuration. Regularly audit your Fastay application, update dependencies, monitor logs, and stay informed about new vulnerabilities and attack vectors. Fastay provides the structure—you provide the security implementation.
