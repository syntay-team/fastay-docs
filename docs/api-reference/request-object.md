---
title: "Request Object"
description: "Complete API reference for the Fastay Request object, extending Express.js and Node.js HTTP capabilities."
---

# Request Object

The Fastay Request object extends Express.js's Request interface, providing access to HTTP request data, headers, parameters, cookies, and body content. It is automatically passed to all route handlers as the first parameter.

## Interface Definition

```typescript
interface Request extends http.IncomingMessage {
  // Core Express properties
  app: Express;
  baseUrl: string;
  body: any;
  cookies: RequestCookies;
  fresh: boolean;
  hostname: string;
  ip: string;
  ips: string[];
  method: string;
  originalUrl: string;
  params: any;
  path: string;
  protocol: string;
  query: any;
  route: any;
  secure: boolean;
  signedCookies: any;
  stale: boolean;
  subdomains: string[];
  xhr: boolean;

  // Express methods
  accepts(types: string | string[]): string | false;
  acceptsCharsets(charsets: string | string[]): string | false;
  acceptsEncodings(encodings: string | string[]): string | false;
  acceptsLanguages(langs: string | string[]): string | false;
  get(field: string): string;
  header(name: string): string;
  is(types: string | string[]): string | false;
  range(size: number, options?: any): any;

  // FormData handling
  formData(): Promise<FormData>;

  // Additional middleware properties
  file?: Express.Multer.File;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
  user?: any;
  session?: any;
  sessionID?: string;
  authInfo?: any;
  cspNonce?: string;
}
```

## Core Properties

### `body`

**Type**: `any`  
**Description**: Contains parsed request body data. Populated by body-parsing middleware like `express.json()` or `express.urlencoded()`. Defaults to `undefined` until middleware processes the request.

```typescript
// Access JSON request body
export async function POST(request: Request) {
  const userData = await request.body;
  // TypeScript users should cast to expected interface
  const data = userData as { name: string; email: string };
}
```

### `cookies`

**Type**: `RequestCookies`  
**Description**: Object containing request cookies with helper methods.

```typescript
interface RequestCookies {
  get(name: string): CookieItem | undefined;
  has(name: string): boolean;
  all(): Record<string, string>;
}

// Usage examples
export async function GET(request: Request) {
  const sessionToken = request.cookies.get("session");
  const hasSession = request.cookies.has("session");
  const allCookies = request.cookies.all();
}
```

### `formData()`

**Type**: `() => Promise<FormData>`  
**Description**: Asynchronously parses and returns the request body as a FormData object. Useful for file uploads and multipart form data.

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("avatar") as File;
  const title = formData.get("title") as string;
}
```

### `params`

**Type**: `any`  
**Description**: Object containing route parameters from dynamic routes.

```typescript
// Route: /api/users/[id]/route.ts
// Request: GET /api/users/123
export async function GET(request: Request) {
  const userId = request.params.id; // "123"
}
```

### `query`

**Type**: `any`  
**Description**: Object containing parsed query string parameters.

```typescript
// Request: GET /api/users?role=admin&page=2&limit=20
export async function GET(request: Request) {
  const role = request.query.role; // "admin"
  const page = request.query.page; // "2"
  const limit = request.query.limit; // "20"
}
```

### `headers`

**Type**: `http.IncomingHttpHeaders`  
**Description**: Object containing HTTP request headers (case-insensitive).

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.authorization;
  const contentType = request.get("content-type");
  const userAgent = request.headers["user-agent"];
}
```

### `method`

**Type**: `string`  
**Description**: HTTP method of the request: `'GET'`, `'POST'`, `'PUT'`, `'DELETE'`, `'PATCH'`, `'OPTIONS'`, or `'HEAD'`.

```typescript
export async function handler(request: Request) {
  if (request.method === "GET") {
    // Handle GET request
  } else if (request.method === "POST") {
    // Handle POST request
  }
}
```

### `path`

**Type**: `string`  
**Description**: Path portion of the request URL (without query string).

```typescript
// Request: GET /api/users?sort=desc
console.log(request.path); // "/api/users"
```

### `url`

**Type**: `string`  
**Description**: Complete request URL including query string.

```typescript
// Request: GET /api/users?sort=desc
console.log(request.url); // "/api/users?sort=desc"
```

### `originalUrl`

**Type**: `string`  
**Description**: Original request URL before any internal rewriting.

## URL and Path Properties

| Property      | Type     | Example                  | Description               |
| ------------- | -------- | ------------------------ | ------------------------- |
| `baseUrl`     | `string` | `"/api"`                 | Mount path of router      |
| `path`        | `string` | `"/users"`               | Path without query string |
| `url`         | `string` | `"/users?sort=desc"`     | Full URL with query       |
| `originalUrl` | `string` | `"/api/users?sort=desc"` | Original URL              |
| `protocol`    | `string` | `"https"`                | `http` or `https`         |
| `hostname`    | `string` | `"api.example.com"`      | Host from Host header     |

## Client Information Properties

### `ip`

**Type**: `string`  
**Description**: Remote IP address of the client. Respects `trustProxy` setting.

### `ips`

**Type**: `string[]`  
**Description**: Array of IP addresses from `X-Forwarded-For` header when behind proxy.

### `xhr`

**Type**: `boolean`  
**Description**: `true` if request has `X-Requested-With: XMLHttpRequest` header.

### `subdomains`

**Type**: `string[]`  
**Description**: Array of subdomains from hostname.

```typescript
// Host: "api.staging.example.com"
console.log(request.subdomains); // ["staging", "api"]
```

## Content Negotiation Methods

### `accepts(types)`

**Type**: `(string | string[]) => string | false`  
**Description**: Checks Accept header, returns best match or `false`.

```typescript
const bestType = request.accepts(["json", "html", "xml"]);
// Returns: "json" or "html" or "xml" or false
```

### `acceptsCharsets(charsets)`

**Type**: `(string | string[]) => string | false`  
**Description**: Checks Accept-Charset header.

### `acceptsEncodings(encodings)`

**Type**: `(string | string[]) => string | false`  
**Description**: Checks Accept-Encoding header.

### `acceptsLanguages(langs)`

**Type**: `(string | string[]) => string | false`  
**Description**: Checks Accept-Language header.

## Header Methods

### `get(field)`

**Type**: `(string) => string`  
**Description**: Gets request header (case-insensitive). Alias: `header()`.

```typescript
const contentType = request.get("Content-Type");
const authHeader = request.header("Authorization");
```

### `is(types)`

**Type**: `(string | string[]) => string | false`  
**Description**: Checks Content-Type header.

```typescript
// Content-Type: application/json
request.is("json"); // => 'json'
request.is("application/json"); // => 'application/json'
```

## Cookie Handling

Fastay provides a simplified cookie API on top of Express.js:

```typescript
// Check if cookie exists
if (request.cookies.has("session")) {
  // Get cookie value
  const session = request.cookies.get("session");
  console.log(session?.value);
}

// Get all cookies as object
const allCookies = request.cookies.all();
// { session: "abc123", theme: "dark" }
```

## File Upload Properties

When using multer or similar middleware:

### `file`

**Type**: `Express.Multer.File | undefined`  
**Description**: Single uploaded file.

### `files`

**Type**: `Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined`  
**Description**: Multiple uploaded files.

```typescript
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
```

## Authentication Properties

### `user`

**Type**: `any`  
**Description**: Authenticated user object (set by authentication middleware).

```typescript
// After auth middleware runs
export async function GET(request: Request) {
  if (request.user) {
    return { data: `Hello ${request.user.name}` };
  }
  return { error: "Not authenticated" };
}
```

### `session`

**Type**: `any`  
**Description**: Session object (set by express-session middleware).

### `sessionID`

**Type**: `string | undefined`  
**Description**: Session ID.

### `authInfo`

**Type**: `any`  
**Description**: Additional authentication context.

## Security Properties

### `secure`

**Type**: `boolean`  
**Description**: `true` if request is over TLS (HTTPS). Equivalent to `request.protocol === 'https'`.

### `fresh`

**Type**: `boolean`  
**Description**: `true` if request is cache-fresh (for conditional GET requests).

### `stale`

**Type**: `boolean`  
**Description**: Opposite of `fresh`.

### `cspNonce`

**Type**: `string | undefined`  
**Description**: Content Security Policy nonce (set by helmet middleware).

## FormData Special Handling

Fastay provides a `formData()` method that returns a native FormData object:

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();

  // Get text fields
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // Get files
  const avatar = formData.get("avatar") as File;
  const attachments = formData.getAll("attachments") as File[];

  // File properties
  console.log(avatar.name); // Original filename
  console.log(avatar.size); // File size in bytes
  console.log(avatar.type); // MIME type
  console.log(avatar.path); // Temporary file path
}
```

## Common Patterns

### Type-Safe Request Handling

```typescript
interface CreateUserRequest {
  name: string;
  email: string;
  age?: number;
}

export async function POST(request: Request) {
  // Type assertion for TypeScript
  const data = (await request.body) as CreateUserRequest;

  // Access with type safety
  const { name, email, age } = data;
}
```

### Parameter and Query Validation

```typescript
export async function GET(request: Request) {
  // Route parameters
  const { id } = request.params;

  // Query parameters (always strings)
  const { page = "1", limit = "20" } = request.query;

  // Convert to numbers
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
}
```

### Authentication Check

```typescript
export async function protectedRoute(request: Request) {
  if (!request.user) {
    // Handle unauthenticated request
    return {
      status: 401,
      body: { error: "Authentication required" },
    };
  }

  // User is authenticated
  return { data: `Hello ${request.user.name}` };
}
```

### File Upload Handling

```typescript
export async function uploadRoute(request: Request) {
  const formData = await request.formData();
  const file = formData.get("document") as File;

  if (!file) {
    return {
      status: 400,
      body: { error: "No file uploaded" },
    };
  }

  // Process the uploaded file
  return {
    message: "File uploaded successfully",
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  };
}
```

## Middleware-Added Properties

Various middleware can add properties to the Request object:

| Middleware             | Property Added  | Type             | Description        |
| ---------------------- | --------------- | ---------------- | ------------------ |
| `express.json()`       | `body`          | `any`            | Parsed JSON body   |
| `express.urlencoded()` | `body`          | `any`            | Parsed form data   |
| `cookie-parser`        | `cookies`       | `RequestCookies` | Parsed cookies     |
| `express-session`      | `session`       | `any`            | Session object     |
| Passport.js            | `user`          | `any`            | Authenticated user |
| multer                 | `file`, `files` | `Multer.File`    | Uploaded files     |
| helmet                 | `cspNonce`      | `string`         | CSP nonce          |

## Inheritance Chain

```
http.IncomingMessage (Node.js)
  ↓
Express.Request (Express.js)
  ↓
Fastay.Request (Fastay)
```

Fastay Request includes all properties and methods from both Node.js's `http.IncomingMessage` and Express.js's `Request`, plus Fastay-specific enhancements like the simplified cookie API and `formData()` method.

## See Also

- [Response Object](./response-object.md) – Response object API reference
- [Middleware API](./middleware-api.md) – Middleware configuration and usage
- [Express.js Request Documentation](https://expressjs.com/en/api.html#req) – Base Express.js request API
