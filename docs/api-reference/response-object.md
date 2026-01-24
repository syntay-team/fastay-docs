---
title: "Response Object"
description: "API reference for Fastay's response handling system, including automatic response formatting and advanced response configuration."
---

# Response Object

Fastay provides a flexible response system that allows route handlers to return data in multiple formats. The framework automatically handles HTTP response creation, content-type headers, and serialization based on the returned value.

## Response Types

Fastay supports several response formats through its unified response interface:

```typescript
interface FastayResponse {
  status?: number;
  body?: any;
  redirect?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, FastayCookie>;
  file?: FastayFile;
  stream?: NodeJS.ReadableStream;
  raw?: Buffer | string;
  static?: FastayStatic;
}

interface FastayCookie {
  value: string;
  options?: Record<string, any>;
}

interface FastayFile {
  path: string;
  filename?: string;
  options?: any;
}

interface FastayStatic {
  path: string;
  contentType?: string;
}
```

## Simple Return Values

Route handlers can return values directly without explicit response configuration. Fastay automatically infers the appropriate HTTP response.

### JSON Objects (Default)

Returning an object automatically sets `Content-Type: application/json`:

```typescript
export async function GET() {
  return { message: "Hello", count: 42 };
}
// Response: 200 OK, Content-Type: application/json
// Body: {"message":"Hello","count":42}
```

### Strings

String returns become plain text responses:

```typescript
export async function GET() {
  return "Hello World";
}
// Response: 200 OK, Content-Type: text/plain
// Body: "Hello World"
```

### Numbers

Numbers are converted to strings:

```typescript
export async function GET() {
  return 42;
}
// Response: 200 OK, Content-Type: text/plain
// Body: "42"
```

### Arrays

Arrays are serialized as JSON:

```typescript
export async function GET() {
  return [1, 2, 3, 4, 5];
}
// Response: 200 OK, Content-Type: application/json
// Body: [1,2,3,4,5]
```

### Null or Undefined

Null or undefined returns generate a 204 No Content response:

```typescript
export async function DELETE() {
  // Delete resource
  return null;
}
// Response: 204 No Content, no body
```

## Advanced Response Configuration

For complete control, return a response configuration object:

### Status Codes

```typescript
export async function POST(request: Request) {
  const data = await request.body;

  return {
    status: 201, // Created
    body: {
      success: true,
      data: data,
      message: "Resource created",
    },
  };
}
```

### Custom Headers

```typescript
export async function GET() {
  return {
    status: 200,
    body: { data: "value" },
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "custom-value",
      "Cache-Control": "public, max-age=3600",
      ETag: '"abc123"',
    },
  };
}
```

### Cookies

Set cookies with configurable options:

```typescript
export async function POST(request: Request) {
  const token = generateAuthToken();

  return {
    status: 200,
    body: { message: "Login successful" },
    cookies: {
      auth_token: {
        value: token,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: "strict",
          path: "/",
          domain:
            process.env.NODE_ENV === "production" ? ".example.com" : undefined,
        },
      },
      user_prefs: {
        value: "dark_mode",
        options: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
      },
    },
  };
}
```

#### Cookie Options

| Option     | Type      | Default        | Description                      |
| ---------- | --------- | -------------- | -------------------------------- |
| `httpOnly` | `boolean` | `false`        | Prevent JavaScript access        |
| `secure`   | `boolean` | `false`        | Only send over HTTPS             |
| `maxAge`   | `number`  | (session)      | Lifetime in milliseconds         |
| `sameSite` | `string`  | `"lax"`        | `"strict"`, `"lax"`, or `"none"` |
| `path`     | `string`  | `"/"`          | Cookie path scope                |
| `domain`   | `string`  | Current domain | Domain scope                     |

## Special Response Types

### File Downloads

Serve files with download prompts:

```typescript
export async function GET() {
  const filePath = "/path/to/document.pdf";

  return {
    file: {
      path: filePath,
      filename: "monthly-report.pdf",
      contentType: "application/pdf",
    },
  };
}
```

#### File Options

| Option        | Type     | Default           | Description           |
| ------------- | -------- | ----------------- | --------------------- |
| `path`        | `string` | Required          | File system path      |
| `filename`    | `string` | Original filename | Download filename     |
| `contentType` | `string` | Inferred          | MIME type             |
| `options`     | `object` | `{}`              | Additional fs options |

### Redirects

Perform HTTP redirects:

```typescript
// Temporary redirect (302 Found)
export async function GET() {
  return {
    redirect: "/new-location",
    status: 302,
  };
}

// Permanent redirect (301 Moved Permanently)
export async function GET() {
  return {
    redirect: "https://new-domain.com/api/v2",
    status: 301,
  };
}

// Redirect with query parameters
export async function GET() {
  return {
    redirect: "/search?q=fastay&sort=newest",
    status: 302,
  };
}
```

### Stream Responses

Stream large responses for efficient memory usage:

```typescript
import fs from "fs";

export async function GET() {
  const videoPath = "/path/to/video.mp4";

  return {
    stream: fs.createReadStream(videoPath),
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": fs.statSync(videoPath).size.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    },
  };
}
```

### Raw Responses

Send raw buffers or strings with custom encoding:

```typescript
export async function GET() {
  return {
    raw: Buffer.from("Hello World in binary"),
    headers: {
      "Content-Type": "application/octet-stream",
    },
  };
}

export async function GET() {
  return {
    raw: "<h1>Hello World</h1>",
    headers: {
      "Content-Type": "text/html",
    },
  };
}
```

### Static File Serving

Serve static files with proper headers:

```typescript
export async function GET() {
  return {
    static: {
      path: "/path/to/image.png",
      contentType: "image/png",
    },
  };
}
```

## Response Methods (Express Underlying)

While Fastay's response system handles most cases, you can access Express's underlying response methods through middleware or advanced scenarios:

### Setting Status Codes

```typescript
export async function handler(request: Request, response: Response) {
  response.status(201); // Set status code
  return { message: "Created" };
}
```

### Setting Headers

```typescript
export async function handler(request: Request, response: Response) {
  response.setHeader("X-Custom-Header", "value");
  response.set({
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  });
  return { data: "value" };
}
```

### Setting Cookies

```typescript
export async function handler(request: Request, response: Response) {
  response.cookie("session", "token123", {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });

  response.clearCookie("old_session");

  return { message: "Cookie set" };
}
```

## Content Negotiation

Fastay can handle different response formats based on Accept headers:

```typescript
export async function GET(request: Request) {
  const data = { message: "Hello", timestamp: new Date() };

  if (request.accepts("html")) {
    return {
      raw: `<h1>${data.message}</h1><p>${data.timestamp}</p>`,
      headers: { "Content-Type": "text/html" },
    };
  }

  if (request.accepts("xml")) {
    return {
      raw: `<response><message>${data.message}</message></response>`,
      headers: { "Content-Type": "application/xml" },
    };
  }

  // Default to JSON
  return data;
}
```

## Error Responses

Return error responses with appropriate status codes:

```typescript
export async function GET(request: Request) {
  const resource = await findResource(request.params.id);

  if (!resource) {
    return {
      status: 404,
      body: {
        error: "Resource not found",
        message: `Resource with ID ${request.params.id} does not exist`,
        code: "NOT_FOUND",
      },
    };
  }

  if (!hasPermission(request.user, resource)) {
    return {
      status: 403,
      body: {
        error: "Forbidden",
        message: "You don't have permission to access this resource",
        code: "FORBIDDEN",
      },
    };
  }

  return resource;
}
```

## Response Compression

Fastay automatically handles response compression when configured:

```typescript
// Enable compression in createApp configuration
await createApp({
  expressOptions: {
    middlewares: [compression()],
  },
});

// Responses are automatically compressed based on:
// - Content-Type
// - Response size
// - Accept-Encoding header
```

## Caching Headers

Set appropriate caching headers:

```typescript
export async function GET() {
  const data = await getCachableData();

  return {
    body: data,
    headers: {
      "Cache-Control": "public, max-age=300", // 5 minutes
      ETag: generateETag(data),
      "Last-Modified": new Date().toUTCString(),
    },
  };
}
```

## Common Response Patterns

### Paginated Responses

```typescript
export async function GET(request: Request) {
  const { page = "1", limit = "20" } = request.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const [items, total] = await Promise.all([
    getItems(pageNum, limitNum),
    getTotalCount(),
  ]);

  return {
    body: {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    },
    headers: {
      "X-Total-Count": total.toString(),
      "X-Total-Pages": Math.ceil(total / limitNum).toString(),
    },
  };
}
```

### API Versioning in Responses

```typescript
export async function GET(request: Request) {
  const data = { id: 1, name: "Example" };
  const apiVersion = request.get("X-API-Version") || "v1";

  if (apiVersion === "v2") {
    return {
      body: {
        data,
        meta: {
          version: "v2",
          format: "enveloped",
        },
      },
    };
  }

  // v1 format (direct data)
  return data;
}
```

### File Upload Response

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  const fileUrl = await saveFile(file);

  return {
    status: 201,
    body: {
      message: "File uploaded successfully",
      file: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
      },
    },
    headers: {
      Location: fileUrl,
    },
  };
}
```

## Response Validation

Fastay validates response structures and provides helpful errors:

```typescript
// Invalid: Missing required path for file response
export async function GET() {
  return {
    file: {
      // Missing 'path' property
      filename: "document.pdf",
    },
  };
}
// Error: File response requires 'path' property

// Invalid: Conflicting response types
export async function GET() {
  return {
    body: { message: "Hello" },
    file: { path: "/file.pdf" },
  };
}
// Error: Cannot specify both 'body' and 'file' in response
```

## Performance Considerations

### Streaming vs Buffering

```typescript
// Good for large files: streams chunks
export async function GET() {
  return {
    stream: createReadStream("/large/file.mp4"),
  };
}

// Good for small data: simple return
export async function GET() {
  return { data: "small" };
}
```

### Response Size Awareness

```typescript
export async function GET() {
  const data = await getPotentiallyLargeData();

  if (JSON.stringify(data).length > 1024 * 1024) {
    // > 1MB
    // Consider streaming or pagination
    return {
      body: {
        message: "Data too large, use paginated endpoint",
        endpoint: "/api/data/paginated",
      },
    };
  }

  return data;
}
```

## See Also

- [Request Object](./request-object.md) – Request handling and data access
- [createApp](./create-app.md) – Application configuration
- [Express.js Response Documentation](https://expressjs.com/en/api.html#res) – Underlying Express response API
