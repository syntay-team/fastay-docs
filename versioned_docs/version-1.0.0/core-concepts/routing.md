---
title: "Routing"
---

# Routing System

Fastay's routing system is designed to be intuitive, powerful, and developer-friendly. It combines file-based routing with automatic route discovery to eliminate the boilerplate code typically associated with Express.js applications.

### Introduction to Fastay Routing

### What Makes Fastay Routing Different?

Traditional Express.js routing requires manual route registration and configuration. Fastay simplifies this by using a **file-based routing system** where the file structure itself determines your API endpoints. This approach offers several advantages:

- **Zero configuration**: Routes are auto-discovered based on your file structure
- **Intuitive organization**: Your folder structure mirrors your API structure
- **Automatic registration**: No need to manually import and register routes
- **TypeScript ready**: Full TypeScript support out of the box

### Basic Concepts

#### File Structure Conventions

In Fastay, your API routes live in the directory specified by `apiDir` in your main configuration (default: `./src/api`). Each subfolder becomes an endpoint, and the `route.ts` file inside defines the HTTP methods for that endpoint.

```
src/
├── api/
│   ├── hello/
│   │   └── route.ts      # → /api/hello
│   ├── users/
│   │   └── route.ts      # → /api/users
│   └── products/
│       └── route.ts      # → /api/products
```

#### Creating Your First Route

Let's create a simple "hello world" endpoint to understand the basics:

```typescript
// src/api/hello/route.ts
import { Request } from "@syntay/fastay";

// GET /api/hello
export async function GET() {
  return { message: "Hello World" };
}

// POST /api/hello
export async function POST(req: Request) {
  const data = await req.body;
  return {
    message: "Data received",
    received: data,
  };
}
```

**What's happening here?**

1. **File location**: The file is at `src/api/hello/route.ts`, so Fastay automatically registers it at `/api/hello`
2. **Exported functions**: Each HTTP method is an exported async function
3. **Request object**: The `req` parameter provides access to request data (body, params, query, etc.)
4. **Return values**: You can return data directly, and Fastay handles the HTTP response

### Route Structure

#### Nested Routes

You can create nested routes by creating subdirectories. This is perfect for organizing related endpoints:

```
src/api/
├── users/
│   ├── route.ts          # /api/users - Main users endpoint
│   └── profile/
│       └── route.ts      # /api/users/profile - User profiles
└── posts/
    ├── route.ts          # /api/posts - Main posts endpoint
    └── comments/
        └── route.ts      # /api/posts/comments - Post comments
```

#### Dynamic Routes (Route Parameters)

Dynamic routes allow you to capture variable parts of the URL. In Fastay, you create dynamic routes using square brackets `[]` in folder names:

```
src/api/
├── users/
│   ├── [id]/            # Dynamic route: /api/users/:id
│   │   └── route.ts
│   └── [id]/posts/      # Nested dynamic route: /api/users/:id/posts
│       └── route.ts
```

**Example dynamic route:**

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";

// GET /api/users/:id
export async function GET(req: Request) {
  const { id } = req.params;

  // Access the dynamic parameter
  console.log(`Fetching user with ID: ${id}`);

  // In a real application, you'd fetch from a database
  return {
    id: id,
    name: "John Doe",
    email: "john@example.com",
  };
}
```

**Key points about dynamic routes:**

- Parameters are accessed via `req.params`
- Parameter names match the folder name (without brackets)
- You can have multiple dynamic segments: `/api/users/[userId]/posts/[postId]`

### HTTP Methods

Fastay supports all standard HTTP methods. Each method corresponds to an exported function in your `route.ts` file.

#### Complete HTTP Method Example

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";

// GET /api/users - Retrieve resources
export async function GET() {
  // Typically used to fetch a list of resources
  return {
    users: [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
    ],
  };
}

// POST /api/users - Create a new resource
export async function POST(req: Request) {
  const userData = await req.body;

  // Create user logic here (database insert, validation, etc.)
  return {
    message: "User created",
    user: userData,
  };
}

// PUT /api/users - Update an entire resource
export async function PUT(req: Request) {
  const userData = await req.body;

  // Replace entire resource
  return {
    message: "Users updated",
    data: userData,
  };
}

// PATCH /api/users - Partially update a resource
export async function PATCH(req: Request) {
  const updates = await req.body;

  // Apply partial updates
  return {
    message: "Users partially updated",
    updates,
  };
}

// DELETE /api/users - Delete resources
export async function DELETE() {
  // Delete logic here
  return {
    message: "All users deleted",
  };
}

// HEAD /api/users - Get headers only
export async function HEAD() {
  // HEAD requests typically return no body, just headers
  return null;
}

// OPTIONS /api/users - CORS preflight requests
export async function OPTIONS() {
  // Return allowed methods for CORS
  return {
    headers: {
      Allow: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
    },
  };
}
```

**When to use each method:**

- **GET**: Retrieve data (safe, idempotent)
- **POST**: Create new resources (not idempotent)
- **PUT**: Replace entire resource (idempotent)
- **PATCH**: Apply partial updates (not idempotent)
- **DELETE**: Remove resources (idempotent)
- **HEAD**: Like GET but headers only
- **OPTIONS**: CORS preflight requests

### Working with Request Data

#### Route Parameters

As shown earlier, dynamic route parameters are accessed via `req.params`:

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";

export async function GET(req: Request) {
  const { id } = req.params;

  // Validate the ID
  if (!id || !/^\d+$/.test(id)) {
    return {
      status: 400,
      body: { error: "Invalid user ID format" },
    };
  }

  // Convert to number for database operations
  const userId = parseInt(id);

  // Fetch user from database
  const user = await database.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  return { user };
}
```

#### Query Parameters

Query strings are accessed via `req.query`:

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";

// Example URL: /api/users?name=John&role=admin&page=2&limit=10
export async function GET(req: Request) {
  // Destructure with default values
  const {
    name,
    role,
    page = "1",
    limit = "20",
    sort = "createdAt",
    order = "desc",
  } = req.query;

  // Build filter object for database query
  const where: any = {};

  // Add filters if provided
  if (name) where.name = { contains: name };
  if (role) where.role = role;

  // Parse pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sorting
  const orderBy: any = {};
  orderBy[sort] = order;

  // Execute database query with filters and pagination
  const [users, total] = await Promise.all([
    database.users.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
    }),
    database.users.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}
```

**Query parameter tips:**

- All query parameters are strings by default
- Use default values for optional parameters
- Convert to appropriate types (numbers, booleans) as needed
- Consider using validation libraries like Zod for complex queries

### Request Body

Fastay provides several ways to access request body data depending on the content type:

#### JSON Body (Most Common)

```typescript
// src/api/users/route.ts
import { Request } from "@syntay/fastay";

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

// POST /api/users
export async function POST(req: Request) {
  // Access JSON body
  const userData: CreateUserDto = await req.body;

  // Basic validation
  if (!userData.name || !userData.email || !userData.password) {
    return {
      status: 400,
      body: {
        error: "Missing required fields",
        required: ["name", "email", "password"],
      },
    };
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    return {
      status: 400,
      body: { error: "Invalid email format" },
    };
  }

  // Business logic (e.g., create user in database)
  const newUser = await database.users.create({
    data: {
      name: userData.name,
      email: userData.email,
      passwordHash: hashPassword(userData.password),
      role: userData.role || "user",
    },
  });

  // Return success response
  return {
    status: 201, // Created
    body: {
      message: "User created successfully",
      user: newUser,
    },
  };
}
```

#### FormData Body (File Uploads)

```typescript
// src/api/upload/route.ts
import { Request } from "@syntay/fastay";

// POST /api/upload
export async function POST(req: Request) {
  // Access FormData
  const formData = await req.formData();

  // Get individual fields
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("file") as File;
  const tags = formData.getAll("tags") as string[];

  // Validation
  if (!title || !file) {
    return {
      status: 400,
      body: { error: "Title and file are required" },
    };
  }

  // Process the uploaded file
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `/uploads/${fileName}`;

  // Save file (implementation depends on storage solution)
  await saveFile(file, filePath);

  return {
    message: "File uploaded successfully",
    data: {
      title,
      description,
      tags,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
      },
    },
  };
}
```

### Response Handling

#### Simple Responses

Fastay automatically handles common response types:

```typescript
// Automatic JSON response (most common)
export async function GET() {
  return { message: "Hello World" };
}

// String response
export async function GET() {
  return "Plain text response";
}

// Number response
export async function GET() {
  return 42; // Returns "42" with Content-Type: text/plain
}

// Array response
export async function GET() {
  return [1, 2, 3, 4, 5];
}

// Null/undefined response (204 No Content)
export async function GET() {
  return null; // Returns 204 No Content
}
```

### Advanced Response Configuration

For more control, you can return a response object:

```typescript
export async function GET() {
  return {
    // HTTP status code
    status: 200,

    // Response body
    body: {
      success: true,
      data: { id: 1, name: "John" },
    },

    // Custom headers
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "custom-value",
      "Cache-Control": "public, max-age=3600",
    },

    // Cookies to set
    cookies: {
      session_token: {
        value: "encrypted-token-here",
        options: {
          httpOnly: true, // Not accessible via JavaScript
          secure: process.env.NODE_ENV === "production", // HTTPS only in production
          sameSite: "strict", // CSRF protection
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      },
    },
  };
}
```

### Special Response Types

#### File Download

```typescript
// src/api/reports/[id]/download/route.ts
import { Request } from "@syntay/fastay";
import fs from "fs";
import path from "path";

// GET /api/reports/:id/download
export async function GET(req: Request) {
  const { id } = req.params;

  // Generate or fetch report
  const reportPath = path.join(process.cwd(), "reports", `${id}.pdf`);

  if (!fs.existsSync(reportPath)) {
    return {
      status: 404,
      body: { error: "Report not found" },
    };
  }

  // Trigger file download
  return {
    file: {
      path: reportPath,
      downloadName: `report-${id}-${Date.now()}.pdf`,
      contentType: "application/pdf",
    },
  };
}
```

#### Stream Response

```typescript
// src/api/videos/[id]/stream/route.ts
import { Request } from "@syntay/fastay";
import fs from "fs";
import path from "path";

// GET /api/videos/:id/stream
export async function GET(req: Request) {
  const { id } = req.params;
  const videoPath = path.join(process.cwd(), "videos", `${id}.mp4`);

  if (!fs.existsSync(videoPath)) {
    return {
      status: 404,
      body: { error: "Video not found" },
    };
  }

  const stats = fs.statSync(videoPath);

  return {
    stream: fs.createReadStream(videoPath),
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": stats.size,
      "Accept-Ranges": "bytes", // Enable byte-range requests
      "Cache-Control": "public, max-age=31536000", // 1 year cache
    },
  };
}
```

#### Redirect Response

```typescript
// Temporary redirect (302)
export async function GET() {
  return {
    redirect: "/new-location",
    status: 302,
  };
}

// Permanent redirect (301)
export async function GET() {
  return {
    redirect: "https://new-domain.com/api/v2",
    status: 301,
  };
}
```

### Error Handling

#### Route-Level Error Handling

```typescript
// src/api/users/[id]/route.ts
import { Request } from "@syntay/fastay";

export async function GET(req: Request) {
  try {
    const { id } = req.params;

    // Input validation
    if (!id || isNaN(parseInt(id))) {
      return {
        status: 400,
        body: { error: "Invalid user ID" },
      };
    }

    // Database operation
    const user = await database.users.findUnique({
      where: { id: parseInt(id) },
    });

    // Resource not found
    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    // Authorization check
    if (user.role === "admin" && !req.user.isAdmin) {
      return {
        status: 403,
        body: { error: "Insufficient permissions" },
      };
    }

    return { user };
  } catch (error) {
    console.error("Error fetching user:", error);

    // Handle specific database errors
    if (error.code === "P2025") {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    // Rate limiting errors
    if (error.message.includes("rate limit")) {
      return {
        status: 429,
        body: {
          error: "Too many requests",
          retryAfter: 60,
        },
      };
    }

    // Generic server error (don't expose details in production)
    return {
      status: 500,
      body: {
        error: "Internal server error",
        referenceId: generateErrorId(), // For tracking in logs
      },
    };
  }
}
```

#### Custom Error Classes

For better error handling across your application, consider creating custom error classes:

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(
      404,
      "NOT_FOUND",
      `${resource}${id ? ` with ID ${id}` : ""} not found`
    );
  }
}

// Usage in routes
import { Request } from "@syntay/fastay";
import { ValidationError, NotFoundError } from "../utils/errors";

export async function POST(req: Request) {
  const data = await req.body;

  // Throw custom errors
  if (!data.email) {
    throw new ValidationError("Email is required");
  }

  const user = await findUserByEmail(data.email);
  if (!user) {
    throw new NotFoundError("User", data.email);
  }

  return { user };
}
```

**Note**: When you throw errors in Fastay routes, they're automatically caught and converted to appropriate HTTP responses.

### Best Practices

#### 1. Route Organization

Organize your routes logically based on resources:

```
src/api/
├── auth/                    # Authentication endpoints
│   ├── login/
│   │   └── route.ts
│   ├── register/
│   │   └── route.ts
│   └── logout/
│       └── route.ts
├── users/                   # User management
│   ├── route.ts            # GET/POST for user collection
│   ├── [id]/               # Individual user operations
│   │   └── route.ts
│   └── [id]/posts/         # User's posts
│       └── route.ts
├── posts/                   # Blog posts
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── comments/
│           └── route.ts
└── admin/                   # Admin endpoints
    ├── users/
    │   └── route.ts
    └── analytics/
        └── route.ts
```

#### 2. Consistent Response Format

Create utility functions for consistent responses:

```typescript
// src/utils/response.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
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
  meta?: ApiResponse["meta"]
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      ...meta,
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
    },
  };
}

// Usage in routes
export async function GET(req: Request) {
  try {
    const users = await database.users.findMany();
    return successResponse(users);
  } catch (error) {
    return errorResponse("DATABASE_ERROR", "Failed to fetch users");
  }
}
```

#### 3. Input Validation

Always validate incoming data:

```typescript
// src/utils/validation.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  role: z.enum(["user", "admin", "moderator"]).default("user"),
});

// Usage in route
export async function POST(req: Request) {
  try {
    const userData = createUserSchema.parse(await req.body);
    // Process validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: "Validation failed",
          details: error.errors,
        },
      };
    }
    throw error;
  }
}
```

#### 4. Security Considerations

- **Always validate and sanitize input**
- **Use HTTPS in production** (`secure: true` for cookies)
- **Implement rate limiting** for public endpoints
- **Use appropriate CORS settings** (see middleware documentation)
- **Never expose sensitive information** in error responses in production

#### 5. Performance Tips

- **Use pagination** for large datasets
- **Implement caching** where appropriate
- **Stream large files** instead of loading them into memory
- **Use database indexes** for frequently queried fields
- **Consider async processing** for long-running operations (return 202 Accepted)

### Common Patterns

#### CRUD Operations

Here's a complete CRUD implementation for a resource:

```typescript
// src/api/products/route.ts
import { Request } from "@syntay/fastay";

// GET /api/products - List products with pagination
export async function GET(req: Request) {
  const { page = "1", limit = "20", search } = req.query;

  const products = await database.products.findMany({
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : undefined,
  });

  return { products };
}

// POST /api/products - Create product
export async function POST(req: Request) {
  const productData = await req.body;

  const product = await database.products.create({
    data: productData,
  });

  return {
    status: 201,
    body: {
      message: "Product created",
      product,
    },
  };
}

// PUT /api/products - Update multiple products
export async function PUT(req: Request) {
  const { updates } = await req.body;

  // Bulk update logic
  return {
    message: "Products updated",
  };
}
```

#### Nested Resources

```typescript
// src/api/users/[userId]/posts/route.ts
import { Request } from "@syntay/fastay";

// GET /api/users/:userId/posts
export async function GET(req: Request) {
  const { userId } = req.params;

  // Verify user exists
  const userExists = await database.users.findUnique({
    where: { id: parseInt(userId) },
  });

  if (!userExists) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  const posts = await database.posts.findMany({
    where: { authorId: parseInt(userId) },
  });

  return { posts };
}
```

### Troubleshooting

### Common Issues

1. **Route not found**

   - Check file location matches expected URL
   - Ensure file is named `route.ts` (not `routes.ts` or `index.ts`)
   - Verify `apiDir` configuration in `src/index.ts`

2. **TypeScript errors**

   - Ensure you have `@syntay/fastay` types installed
   - Check TypeScript configuration includes the API directory

3. **Request/Response issues**

   - Use `await req.body` for JSON/form data
   - Check Content-Type headers match expected format
   - Validate input data before processing

4. **Performance problems**
   - Implement pagination for list endpoints
   - Add database indexes for frequently filtered fields
   - Consider caching for expensive operations

### Next Steps

Now that you understand routing in Fastay, you might want to explore:

- **[Middleware](./middleware.md)**: Add authentication, logging, and validation
- **[Error Handling](./error-handling.md)**: Global error handling and custom error pages
- **[File Uploads](../recipes/file-upload.md)**: Advanced file handling and storage
- **[WebSockets](../recipes/real-time.md)**: Real-time communication
- **[Database Integration](../guides/database-integration.md)**: Connecting to PostgreSQL, MongoDB, etc.

Fastay's routing system is designed to be simple yet powerful, allowing you to focus on building your API logic rather than configuration boilerplate. As you build more complex applications, you'll appreciate how the file-based structure keeps your code organized and maintainable.
