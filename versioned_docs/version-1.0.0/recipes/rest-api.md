---
title: "REST API"
description: "Build comprehensive REST APIs with Fastay using industry best practices, proper HTTP semantics, and Fastay's intuitive file-based routing."
---

# Building REST APIs with Fastay

Fastay is particularly well-suited for building RESTful APIs due to its file-based routing system, clean separation of concerns, and TypeScript-first approach. This recipe demonstrates how to implement a complete REST API following best practices while leveraging Fastay's conventions.

## REST API Principles in Fastay

A well-designed REST API in Fastay follows these principles:

1. **Resource-oriented URLs** - Files and folders map directly to resource paths
2. **Proper HTTP method usage** - GET, POST, PUT, PATCH, DELETE for appropriate operations
3. **Stateless interactions** - Each request contains all necessary information
4. **Consistent response formats** - Predictable structure across all endpoints
5. **Meaningful status codes** - HTTP status codes that indicate request outcome

Fastay's architecture naturally supports these principles through its file structure and HTTP method exports.

## Project Structure for REST APIs

Organize your Fastay project for REST API development:

```
src/
├── api/
│   ├── users/
│   │   ├── route.ts          # GET/POST /api/users
│   │   └── [userId]/
│   │       ├── route.ts      # GET/PUT/DELETE /api/users/:id
│   │       └── posts/
│   │           └── route.ts  # GET/POST /api/users/:id/posts
│   ├── posts/
│   │   ├── route.ts          # GET/POST /api/posts
│   │   └── [postId]/
│   │       ├── route.ts      # GET/PUT/PATCH/DELETE /api/posts/:id
│   │       └── comments/
│   │           └── route.ts  # GET/POST /api/posts/:id/comments
│   └── categories/
│       └── route.ts          # GET /api/categories
├── services/
│   ├── user-service.ts
│   ├── post-service.ts
│   └── comment-service.ts
├── middlewares/
│   ├── auth.ts
│   ├── validation.ts
│   └── middleware.ts
└── utils/
    ├── response.ts
    └── errors.ts
```

This structure keeps related endpoints together and follows RESTful nesting conventions.

## Implementing Resource Endpoints

### Collection Endpoints (GET/POST)

```typescript
// src/api/users/route.ts - Collection endpoints
import { Request } from "@syntay/fastay";
import { UserService } from "@/services/user-service";
import { validateUserCreate } from "@/middlewares/validation";

const userService = new UserService();

// GET /api/users - List users with pagination
export async function GET(request: Request) {
  const { page = "1", limit = "20", search } = request.query;

  const result = await userService.findAll({
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    search: search as string,
  });

  return {
    data: result.users,
    meta: {
      pagination: result.pagination,
    },
  };
}

// POST /api/users - Create new user
export async function POST(request: Request) {
  const userData = await request.body;

  try {
    const user = await userService.create(userData);

    return {
      status: 201, // Created
      headers: {
        Location: `/api/users/${user.id}`,
      },
      body: {
        data: user,
        message: "User created successfully",
      },
    };
  } catch (error) {
    // Handle duplicate email or validation errors
    if (error.code === "P2002") {
      // Prisma unique constraint
      return {
        status: 409, // Conflict
        body: {
          error: "CONFLICT",
          message: "Email address already registered",
        },
      };
    }

    throw error; // Let global error handler handle it
  }
}
```

### Single Resource Endpoints (GET/PUT/PATCH/DELETE)

```typescript
// src/api/users/[userId]/route.ts - Single user endpoints
import { Request } from "@syntay/fastay";
import { UserService } from "@/services/user-service";

const userService = new UserService();

// GET /api/users/:userId - Get specific user
export async function GET(request: Request) {
  const { userId } = request.params;

  const user = await userService.findById(userId);

  if (!user) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `User with ID ${userId} not found`,
      },
    };
  }

  return {
    data: user,
  };
}

// PUT /api/users/:userId - Replace entire user
export async function PUT(request: Request) {
  const { userId } = request.params;
  const userData = await request.body;

  try {
    const user = await userService.update(userId, userData);

    return {
      data: user,
      message: "User updated successfully",
    };
  } catch (error) {
    if (error.code === "P2025") {
      // Record not found
      return {
        status: 404,
        body: {
          error: "NOT_FOUND",
          message: `User with ID ${userId} not found`,
        },
      };
    }

    throw error;
  }
}

// PATCH /api/users/:userId - Partially update user
export async function PATCH(request: Request) {
  const { userId } = request.params;
  const updates = await request.body;

  // Validate that only allowed fields are being updated
  const allowedUpdates = ["name", "avatar", "bio"];
  const invalidUpdates = Object.keys(updates).filter(
    (key) => !allowedUpdates.includes(key),
  );

  if (invalidUpdates.length > 0) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: `Cannot update fields: ${invalidUpdates.join(", ")}`,
      },
    };
  }

  const user = await userService.partialUpdate(userId, updates);

  return {
    data: user,
    message: "User partially updated",
  };
}

// DELETE /api/users/:userId - Delete user
export async function DELETE(request: Request) {
  const { userId } = request.params;

  await userService.delete(userId);

  return {
    status: 204, // No Content - successful deletion with no response body
  };
}
```

## Nested Resources

For related resources, use nested routes:

```typescript
// src/api/users/[userId]/posts/route.ts
import { Request } from "@syntay/fastay";
import { PostService } from "@/services/post-service";

const postService = new PostService();

// GET /api/users/:userId/posts - Get user's posts
export async function GET(request: Request) {
  const { userId } = request.params;
  const { page = "1", limit = "20" } = request.query;

  // Verify user exists
  const userExists = await userService.exists(userId);
  if (!userExists) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `User with ID ${userId} not found`,
      },
    };
  }

  const posts = await postService.findByUser(userId, {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });

  return {
    data: posts,
    meta: {
      userId,
    },
  };
}

// POST /api/users/:userId/posts - Create post for user
export async function POST(request: Request) {
  const { userId } = request.params;
  const postData = await request.body;

  // Add user ID to post data
  const postWithUser = {
    ...postData,
    authorId: userId,
  };

  const post = await postService.create(postWithUser);

  return {
    status: 201,
    headers: {
      Location: `/api/posts/${post.id}`,
    },
    body: {
      data: post,
      message: "Post created successfully",
    },
  };
}
```

## Service Layer Implementation

Keep business logic in services for clean separation:

```typescript
// src/services/user-service.ts
import { db } from "@/lib/database";

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserService {
  async findAll(filters: UserFilters = {}): Promise<PaginationResult<User>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          // Don't include sensitive fields like password
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        _count: {
          select: { posts: true, comments: true },
        },
      },
    });
  }

  async create(userData: CreateUserDto): Promise<User> {
    // Hash password before storing
    const hashedPassword = await hashPassword(userData.password);

    return db.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        // Set default role if not provided
        role: userData.role || "user",
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.user.count({ where: { id } });
    return count > 0;
  }
}
```

## Request Validation with Zod

Validate incoming requests using Zod schemas:

```typescript
// src/middlewares/validation.ts
import { z } from "zod";

// User validation schemas
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["user", "admin", "moderator"]).default("user"),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
});

// Validation middleware factory
export function validate(schema: z.ZodSchema) {
  return async function (request: Request, response: Response, next: Next) {
    try {
      const validatedData = schema.parse(await request.body);
      request.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

// Specific validation middlewares
export const validateUserCreate = validate(createUserSchema);
export const validateUserUpdate = validate(updateUserSchema);
```

## Consistent Response Formatting

Create response utilities for consistent API responses:

```typescript
// src/utils/response.ts
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function successResponse<T>(
  data: T,
  meta?: Omit<ApiResponse["meta"], "timestamp">,
): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string,
): ApiResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

// Usage in route handlers
export async function GET(request: Request) {
  const users = await userService.findAll();
  return successResponse(users, {
    pagination: users.pagination,
  });
}
```

## Error Handling Strategy

Implement comprehensive error handling:

```typescript
// src/utils/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;

    super(404, "NOT_FOUND", message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(409, "CONFLICT", message, details);
  }
}

// Global error handler
export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
) {
  console.error("API Error:", {
    error: error.message,
    stack: error.stack,
    path: request.path,
    method: request.method,
    userId: request.user?.id,
  });

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.requestId,
      },
    });
  }

  // Handle validation errors
  if (error.name === "ZodError") {
    return response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.errors,
      },
    });
  }

  // Generic server error
  const isProduction = process.env.NODE_ENV === "production";

  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProduction ? "An unexpected error occurred" : error.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
      ...(!isProduction && { stack: error.stack }),
    },
  });
}
```

## Authentication and Authorization

Secure your REST API with proper authentication:

```typescript
// src/middlewares/auth.ts
import { Request, Response, Next } from "@syntay/fastay";

export async function authenticate(
  request: Request,
  response: Response,
  next: Next,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyJwtToken(token);
    request.user = await userService.findById(decoded.userId);

    if (!request.user) {
      return response.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "User not found",
        },
      });
    }

    next();
  } catch (error) {
    return response.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
}

export function requireRole(roles: string[]) {
  return async function (request: Request, response: Response, next: Next) {
    if (!request.user) {
      return response.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!roles.includes(request.user.role)) {
      return response.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
}
```

## API Versioning Strategy

Plan for API evolution with versioning:

```typescript
// Option 1: URL path versioning (recommended)
// Structure: src/api/v1/users/route.ts, src/api/v2/users/route.ts

// Option 2: Header-based versioning
export function apiVersion(version: string) {
  return async function (request: Request, response: Response, next: Next) {
    const requestedVersion = request.get("x-api-version") || "v1";

    if (requestedVersion !== version) {
      // Skip this middleware if version doesn't match
      return next();
    }

    // Version-specific logic here
    request.apiVersion = version;

    // Handle version-specific transformations
    const originalJson = response.json;
    response.json = function (data: any) {
      if (version === "v2") {
        // Transform to v2 format
        data = transformToV2(data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

// Apply versioning middleware
export const middleware = createMiddleware({
  "/api/users": [apiVersion("v2")],
  // v1 routes don't need the middleware
});
```

## Pagination Implementation

Implement consistent pagination across all list endpoints:

```typescript
// src/utils/pagination.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function parsePagination(query: any): PaginationParams {
  return {
    page: query.page ? parseInt(query.page) : 1,
    limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20, // Max 100 per page
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  };
}

export function buildPaginationHeaders(
  response: Response,
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
) {
  response.setHeader("X-Pagination-Page", pagination.page);
  response.setHeader("X-Pagination-Limit", pagination.limit);
  response.setHeader("X-Pagination-Total", pagination.total);
  response.setHeader("X-Pagination-TotalPages", pagination.totalPages);

  // Add Link header for RESTful pagination
  const baseUrl = response.req?.url?.split("?")[0] || "";
  const queryParams = new URLSearchParams(response.req?.query as any);

  const links = [];

  if (pagination.page > 1) {
    queryParams.set("page", (pagination.page - 1).toString());
    links.push(`<${baseUrl}?${queryParams}>; rel="prev"`);
  }

  if (pagination.page < pagination.totalPages) {
    queryParams.set("page", (pagination.page + 1).toString());
    links.push(`<${baseUrl}?${queryParams}>; rel="next"`);
  }

  if (links.length > 0) {
    response.setHeader("Link", links.join(", "));
  }
}
```

## Complete Example: Blog API

Putting it all together for a blog API:

```typescript
// src/api/posts/route.ts
import { Request } from "@syntay/fastay";
import { PostService } from "@/services/post-service";
import { validatePostCreate } from "@/middlewares/validation";
import { successResponse } from "@/utils/response";
import { parsePagination, buildPaginationHeaders } from "@/utils/pagination";

const postService = new PostService();

// GET /api/posts - List all posts
export async function GET(request: Request, response: Response) {
  const pagination = parsePagination(request.query);
  const { category, authorId, search } = request.query;

  const result = await postService.findAll({
    ...pagination,
    category: category as string,
    authorId: authorId as string,
    search: search as string,
  });

  // Add pagination headers
  buildPaginationHeaders(response, result.pagination);

  return successResponse(result.posts, {
    pagination: result.pagination,
  });
}

// POST /api/posts - Create new post
export async function POST(request: Request) {
  // Request already validated by middleware
  const postData = request.validatedData;

  const post = await postService.create({
    ...postData,
    authorId: request.user.id, // From authentication middleware
  });

  return {
    status: 201,
    headers: {
      Location: `/api/posts/${post.id}`,
    },
    body: successResponse(post, {
      message: "Post created successfully",
    }),
  };
}
```

## Testing REST API Endpoints

Test your REST API with proper HTTP semantics:

```typescript
// tests/api/users.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";

describe("Users API", () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    const result = await createApp({
      apiDir: "./src/api",
      baseRoute: "/api",
      port: 0,
      mode: "test",
    });
    app = result.app;

    // Create test user and get token
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });

    authToken = registerResponse.body.data.token;
  });

  it("GET /api/users returns paginated users", async () => {
    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.meta.pagination).toBeDefined();
    expect(response.headers["x-pagination-total"]).toBeDefined();
  });

  it("POST /api/users creates new user", async () => {
    const userData = {
      name: "New User",
      email: "new@example.com",
      password: "Password123!",
    };

    const response = await request(app)
      .post("/api/users")
      .send(userData)
      .expect(201);

    expect(response.body.data.id).toBeDefined();
    expect(response.headers.location).toMatch(/\/api\/users\/\w+/);
    expect(response.body.data.email).toBe(userData.email);
  });

  it("returns 409 for duplicate email", async () => {
    const userData = {
      name: "Duplicate User",
      email: "duplicate@example.com",
      password: "Password123!",
    };

    // First request succeeds
    await request(app).post("/api/users").send(userData).expect(201);

    // Second request fails with conflict
    const response = await request(app)
      .post("/api/users")
      .send(userData)
      .expect(409);

    expect(response.body.error.code).toBe("CONFLICT");
  });
});
```

## REST API Best Practices Summary

1. **Use proper HTTP methods**: GET for retrieval, POST for creation, PUT for replacement, PATCH for updates, DELETE for removal.

2. **Implement pagination for collections**: Always paginate list endpoints to prevent performance issues.

3. **Use consistent error formats**: Return errors in a predictable structure with appropriate HTTP status codes.

4. **Validate all inputs**: Never trust client data; validate and sanitize every request.

5. **Keep responses lean**: Only return necessary data; consider field selection for performance.

6. **Version your API**: Plan for changes by implementing versioning from the start.

7. **Document your API**: Use OpenAPI/Swagger or similar tools to document endpoints.

8. **Implement proper authentication**: Secure sensitive endpoints with JWT or similar authentication.

9. **Handle CORS properly**: Configure CORS for your frontend domains in production.

10. **Monitor and log**: Implement comprehensive logging and monitoring for production APIs.

Fastay's file-based routing and TypeScript support make implementing these REST API best practices straightforward and maintainable. By following these patterns, you can build robust, scalable REST APIs that are easy to understand, test, and evolve over time.
