---
title: "Request & Response"
---

# Request & Response Objects

In Fastay, every route handler receives `Request` and `Response` objects that provide an intuitive interface for handling HTTP communication. These objects are enhanced versions of Express.js equivalents with additional features and better TypeScript support.

## Overview

Fastay's Request and Response objects simplify HTTP handling while giving you complete control. Each route handler automatically receives these objects:

```typescript
import { Request, Response } from "@syntay/fastay";

export async function GET(request: Request, response: Response) {
  // Handle GET requests
}

export async function POST(request: Request, response: Response) {
  // Handle POST requests
}
```

### Key Features

- **TypeScript First**: Full TypeScript support with proper typing
- **Enhanced Methods**: Additional methods beyond standard Express
- **Intuitive API**: Simplified access to common operations
- **Automatic Parsing**: Request bodies are automatically parsed based on Content-Type

## The Request Object

The `Request` object contains all information about the incoming HTTP request.

### Accessing Request Data

```typescript
export async function GET(request: Request) {
  // HTTP Method
  const method = request.method; // "GET", "POST", etc.

  // URL Information
  const url = request.url; // Full URL
  const path = request.path; // Path without query string

  // Headers
  const authHeader = request.headers.authorization;
  const contentType = request.get("content-type");

  // Client Information
  const clientIp = request.ip;
  const hostname = request.hostname;

  return {
    requestInfo: {
      method,
      path,
      clientIp,
      timestamp: new Date().toISOString(),
    },
  };
}
```

### Query Parameters

Fastay automatically parses query strings from URLs:

```typescript
// Example: GET /api/users?role=admin&page=2&limit=20
export async function GET(request: Request) {
  // Access all query parameters
  const query = request.query;
  // { role: "admin", page: "2", limit: "20" }

  // Access specific parameters
  const role = request.query.role;
  const page = request.query.page || "1";
  const limit = request.query.limit || "20";

  // Parse numbers
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  return {
    filters: {
      role,
      page: pageNum,
      limit: limitNum,
    },
  };
}
```

### Route Parameters

For dynamic routes, parameters are automatically extracted:

```typescript
// File: /api/users/[userId]/route.ts
// URL: /api/users/123

export async function GET(request: Request) {
  // Access the dynamic parameter
  const userId = request.params.userId;

  // Validate and convert
  if (!userId || isNaN(parseInt(userId))) {
    return {
      status: 400,
      body: { error: "Invalid user ID" },
    };
  }

  const id = parseInt(userId);

  return {
    userId: id,
    message: `Fetching user with ID: ${id}`,
  };
}
```

### Request Body

Fastay automatically parses request bodies based on Content-Type:

```typescript
// JSON Body (Content-Type: application/json)
export async function POST(request: Request) {
  const body = await request.body;
  // Already parsed as JavaScript object

  // TypeScript with interface
  interface CreateUserDto {
    name: string;
    email: string;
    age?: number;
  }

  const userData = body as CreateUserDto;

  return {
    message: "User data received",
    data: userData,
  };
}
```

#### FormData (File Uploads)

For file uploads and form data:

```typescript
// Content-Type: multipart/form-data
export async function POST(request: Request) {
  const formData = await request.formData();

  // Get form fields
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // Get uploaded file
  const file = formData.get("avatar") as File;

  if (file) {
    // File information
    const fileInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
      // Temporary path where file is stored
      tempPath: file.path,
    };

    // Process the file...
  }

  return {
    message: "Form submitted",
    data: { name, email, hasAvatar: !!file },
  };
}
```

### Cookies

Fastay provides convenient cookie handling:

```typescript
export async function GET(request: Request) {
  // Check if a cookie exists
  const hasSession = request.cookies.has("session_id");

  // Get cookie value
  const sessionId = request.cookies.get("session_id");

  // Get all cookies
  const allCookies = request.cookies.all();
  // { session_id: "abc123", user_prefs: "dark_mode" }

  return {
    authenticated: hasSession,
    sessionId,
    cookies: allCookies,
  };
}
```

## The Response Object

The `Response` object is used to send HTTP responses back to the client.

### Basic Response Methods

```typescript
export async function GET(request: Request, response: Response) {
  // 1. Send JSON response (most common)
  return response.json({
    success: true,
    data: { id: 1, name: "Fastay" },
  });

  // 2. Send plain text
  return response.send("Hello, World!");

  // 3. Set status code before sending
  response.status(201); // Created
  return response.json({
    message: "Resource created",
  });
}
```

### Setting Headers

```typescript
export async function GET(request: Request, response: Response) {
  // Set individual headers
  response.setHeader("Content-Type", "application/json");
  response.setHeader("X-API-Version", "1.0.0");
  response.setHeader("Cache-Control", "public, max-age=3600");

  // Set multiple headers at once
  response.set({
    "Content-Type": "application/json",
    "X-Powered-By": "Fastay",
    "X-Request-ID": generateRequestId(),
  });

  return response.json({ message: "Headers set" });
}
```

### Setting Cookies

```typescript
export async function POST(request: Request, response: Response) {
  // Set a cookie
  response.cookie("session_token", "encrypted_token_value", {
    httpOnly: true, // Not accessible via JavaScript
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: "/", // Available on all routes
  });

  // Set a cookie with domain (production only)
  if (process.env.NODE_ENV === "production") {
    response.cookie("user_prefs", "dark_mode", {
      domain: ".example.com", // Available on all subdomains
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  // Clear a cookie
  response.clearCookie("old_session");

  return response.json({
    message: "Authentication successful",
    cookiesSet: true,
  });
}
```

### Advanced Response Patterns

Fastay supports advanced response patterns for different use cases:

```typescript
export async function GET(request: Request, response: Response) {
  const acceptHeader = request.get("accept");

  // Content negotiation
  if (acceptHeader?.includes("application/xml")) {
    response.setHeader("Content-Type", "application/xml");
    return response.send(`
      <?xml version="1.0"?>
      <response>
        <status>success</status>
        <message>XML response</message>
      </response>
    `);
  }

  if (acceptHeader?.includes("text/html")) {
    response.setHeader("Content-Type", "text/html");
    return response.send(`
      <!DOCTYPE html>
      <html>
        <head><title>API Response</title></head>
        <body>
          <h1>HTML Response</h1>
          <p>This is an HTML response from the API</p>
        </body>
      </html>
    `);
  }

  // Default to JSON
  return response.json({
    status: "success",
    message: "JSON response",
    format: "json",
  });
}
```

## Response Format in Fastay

Fastay provides a flexible response system. You can return data in several ways:

### Simple Return Values

```typescript
// Return JSON object (automatically sets Content-Type: application/json)
export async function GET() {
  return { message: "Hello" };
}

// Return string
export async function GET() {
  return "Plain text response";
}

// Return number
export async function GET() {
  return 42; // Becomes "42" with Content-Type: text/plain
}

// Return array
export async function GET() {
  return [1, 2, 3, 4, 5];
}

// Return null or undefined (204 No Content)
export async function DELETE() {
  // Perform delete operation...
  return null; // Returns 204 No Content
}
```

### Advanced Response Configuration

For more control, return a response configuration object:

```typescript
export async function POST(request: Request) {
  const data = await request.body;

  return {
    // HTTP status code
    status: 201, // Created

    // Response body
    body: {
      success: true,
      data: data,
      message: "Resource created successfully",
    },

    // Custom headers
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "value",
      Location: `/api/resources/${data.id}`,
    },

    // Set cookies
    cookies: {
      auth_token: {
        value: "jwt_token_here",
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: "strict",
        },
      },
    },
  };
}
```

### Special Response Types

#### File Download

```typescript
export async function GET() {
  const filePath = "/path/to/document.pdf";

  return {
    file: {
      path: filePath,
      downloadName: "document.pdf",
      contentType: "application/pdf",
    },
  };
}
```

#### Redirect

```typescript
export async function GET() {
  // Temporary redirect (302)
  return {
    redirect: "/new-location",
    status: 302,
  };

  // Permanent redirect (301)
  return {
    redirect: "https://new-domain.com",
    status: 301,
  };
}
```

#### Stream Response

```typescript
import fs from "fs";

export async function GET() {
  const videoPath = "/path/to/video.mp4";

  return {
    stream: fs.createReadStream(videoPath),
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": fs.statSync(videoPath).size,
    },
  };
}
```

## Practical Examples

### User Registration Endpoint

```typescript
import { Request, Response } from "@syntay/fastay";

export async function POST(request: Request, response: Response) {
  try {
    const userData = await request.body;

    // Validation
    if (!userData.email || !userData.password) {
      return response.status(400).json({
        error: "Email and password are required",
      });
    }

    // Create user in database
    const user = await database.users.create({
      data: {
        email: userData.email,
        passwordHash: await hashPassword(userData.password),
        name: userData.name,
      },
    });

    // Generate JWT token
    const token = generateJWT({ userId: user.id });

    // Set authentication cookie
    response.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    // Return success response
    return response.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email
    if (error.code === "P2002") {
      // Prisma unique constraint
      return response.status(409).json({
        error: "Email already registered",
      });
    }

    return response.status(500).json({
      error: "Registration failed",
    });
  }
}
```

### File Upload Handler

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("file") as File;

  if (!title || !file) {
    return {
      status: 400,
      body: { error: "Title and file are required" },
    };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2)}.${fileExt}`;
  const filePath = `/uploads/${fileName}`;

  // Move file to permanent storage
  await saveFile(file, filePath);

  return {
    status: 200,
    body: {
      message: "File uploaded successfully",
      file: {
        originalName: file.name,
        storedName: fileName,
        size: file.size,
        type: file.type,
        url: `/files/${fileName}`,
      },
    },
  };
}
```

## Best Practices

### 1. Validate Input Early

```typescript
export async function POST(request: Request) {
  const data = await request.body;

  // Validate required fields
  const requiredFields = ["name", "email", "password"];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    return {
      status: 400,
      body: {
        error: "Missing required fields",
        missing: missingFields,
      },
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return {
      status: 400,
      body: { error: "Invalid email format" },
    };
  }

  // Process valid data...
}
```

### 2. Use Appropriate Status Codes

```typescript
export async function handleRequest(request: Request, response: Response) {
  // Success codes
  response.status(200); // OK
  response.status(201); // Created
  response.status(204); // No Content

  // Client error codes
  response.status(400); // Bad Request
  response.status(401); // Unauthorized
  response.status(403); // Forbidden
  response.status(404); // Not Found
  response.status(409); // Conflict

  // Server error codes
  response.status(500); // Internal Server Error
  response.status(503); // Service Unavailable
}
```

### 3. Set Security Headers

```typescript
export async function GET(request: Request, response: Response) {
  // Security headers
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-XSS-Protection", "1; mode=block");

  // CORS headers if needed
  response.setHeader(
    "Access-Control-Allow-Origin",
    "https://trusted-domain.com"
  );

  // Cache headers
  response.setHeader("Cache-Control", "private, max-age=300");

  return response.json({ data: "secure" });
}
```

### 4. Handle Errors Gracefully

```typescript
export async function GET(request: Request) {
  try {
    const { id } = request.params;

    // Database operation that might fail
    const data = await database.find(id);

    if (!data) {
      return {
        status: 404,
        body: {
          error: "Resource not found",
          resourceId: id,
        },
      };
    }

    return { data };
  } catch (error) {
    console.error("Request failed:", error);

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === "production";

    return {
      status: 500,
      body: {
        error: "Internal server error",
        ...(isProduction ? {} : { details: error.message }),
      },
    };
  }
}
```

## Common Patterns

### Pagination Response

```typescript
export async function GET(request: Request) {
  const { page = "1", limit = "20" } = request.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // Get paginated data
  const [items, total] = await Promise.all([
    database.items.findMany({
      skip: offset,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    database.items.count(),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  };
}
```

### API Versioning via Headers

```typescript
export async function GET(request: Request) {
  const apiVersion = request.get("x-api-version") || "v1";

  switch (apiVersion) {
    case "v1":
      return {
        data: {
          /* v1 data structure */
        },
        meta: { version: "v1" },
      };

    case "v2":
      return {
        data: {
          /* v2 data structure */
        },
        meta: { version: "v2" },
      };

    default:
      return {
        status: 400,
        body: {
          error: "Unsupported API version",
          supportedVersions: ["v1", "v2"],
        },
      };
  }
}
```

## Troubleshooting

This section covers common issues you may encounter when working with Fastay and explains **why they happen** and **how to fix them**.

### Issue: `request.body` is undefined

In Fastay, the request body is **asynchronous by design**.
This allows the framework to support different body parsers (JSON, form data, streams) in a consistent way.

Accessing `request.body` without `await` returns a Promise, not the actual data.

```typescript
// ✗ Incorrect: returns a Promise
const body = request.body;

// ✓ Correct: resolves the request body
const body = await request.body;
```

Once awaited, the body contains the parsed request payload.

### Issue: Cannot set headers after they are sent

This error happens when a response is sent more than once for the same request.

In Fastay, once you call `response.json()`, `response.send()`, or similar methods, the response is finalized.
Any further attempt to modify headers or send another response will throw an error.

```ts
// ✗ Sending multiple responses
response.status(401).json({ error: "Unauthorized" });
response.json({ data: "secret" }); // Error
```

Always stop execution after sending a response:

```ts
// ✓ Correct
response.status(401).json({ error: "Unauthorized" });
return;
```

This pattern is especially important in middleware.

### Issue: File upload not working

Fastay distinguishes between **JSON bodies** and **multipart form data**.

For file uploads, the request must use `multipart/form-data`, and the body should be accessed using `request.formData()` instead of `request.body`.

```ts
const formData = await request.formData();
const file = formData.get("file") as File;
```

Using `request.body` for file uploads will not work, because multipart data requires a different parser.

### Issue: Cookies not being set

Cookie behavior depends on browser security rules, not just server code.

When setting cookies in Fastay, make sure the options match your environment:

```ts
response.cookie("name", "value", {
  httpOnly: true,
  secure: true, // Requires HTTPS
  sameSite: "none", // Required for cross-site cookies
  domain: ".example.com",
});
```

If cookies are not being set:

- Ensure HTTPS is enabled when `secure: true`
- Verify `sameSite` settings for cross-origin requests
- Check that the domain matches your application

> _If a request reaches a route handler, all registered middlewares have already completed successfully._
