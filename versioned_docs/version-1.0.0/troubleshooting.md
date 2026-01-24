---
title: "Troubleshooting"
description: "Diagnose and resolve common issues when developing with Fastay.js"
---

# Troubleshooting Fastay.js

This guide helps you identify and fix common problems when working with Fastay.js applications.

## Server Starts but Routes Don't Respond

**Symptom**
The Fastay server starts successfully (shows listening port), but HTTP requests to your routes return 404 Not Found.

**Likely Cause**

- The `apiDir` path is incorrect or doesn't exist
- Route files are not named `route.ts` (or `route.js`)
- The `baseRoute` configuration doesn't match what you're requesting

**How to Resolve**

1. Verify your `createApp` configuration:

   ```typescript
   await createApp({
     apiDir: "./src/api", // Ensure this path exists
     baseRoute: "/api", // Routes will be under /api/*
   });
   ```

2. Check your file structure:

   ```
   src/api/hello/route.ts   → GET /api/hello
   src/api/users/route.ts   → GET /api/users
   ```

3. Confirm route files are named exactly `route.ts` (not `routes.ts`, `index.ts`, etc.)

## Route Not Being Loaded

**Symptom**
A specific route file exists but returns 404, while other routes work.

**Likely Cause**

- File naming or location doesn't match expected pattern
- Dynamic route folder naming uses wrong syntax
- Route file contains syntax errors that prevent loading

**How to Resolve**

1. For dynamic routes, use brackets `[]`:

   ```
   src/api/users/[id]/route.ts   → GET /api/users/:id
   ```

2. Check for TypeScript/JavaScript errors in the route file
3. Verify the file exports HTTP methods correctly:
   ```typescript
   // Must export functions named after HTTP methods
   export async function GET(request: Request) {
     return { message: "Hello" };
   }
   ```

## Middleware Not Executed

**Symptom**
Middleware functions are defined but don't run for requests.

**Likely Cause**

- Middleware not registered in `middleware.ts`
- Route pattern doesn't match the requested path
- Middleware file not in `src/middlewares/` directory
- Middleware doesn't call `next()` or sends a response

**How to Resolve**

1. Ensure middleware is registered in `src/middlewares/middleware.ts`:

   ```typescript
   import { createMiddleware } from "@syntay/fastay";
   import { auth } from "./auth";

   export const middleware = createMiddleware({
     "/api/protected": [auth], // Apply to /api/protected
     "/": [logger], // Apply to all routes
   });
   ```

2. Verify middleware calls `next()` to continue the chain

## Request Body is Undefined

**Symptom**
`await request.body` returns `undefined` or empty object.

**Likely Cause**

- Not awaiting `request.body` (it returns a Promise)
- Missing `Content-Type: application/json` header
- Body size exceeds parser limits
- Using wrong method to access body (FormData vs JSON)

**How to Resolve**

1. Always await the body:

   ```typescript
   // ✗ Wrong
   const data = request.body;

   // ✓ Correct
   const data = await request.body;
   ```

2. For JSON requests, include proper headers:

   ```javascript
   // Client-side fetch
   fetch("/api/users", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "John" }),
   });
   ```

3. For FormData/File uploads, use `formData()` method:
   ```typescript
   const formData = await request.formData();
   const file = formData.get("avatar") as File;
   ```

## CORS Errors in Browser

**Symptom**
Browser shows CORS errors when calling your API from a different origin.

**Likely Cause**

- CORS not configured in Fastay
- Frontend and backend on different ports/domains
- Missing credentials configuration

**How to Resolve**

1. Configure CORS in your `createApp`:

   ```typescript
   await createApp({
     enableCors: {
       allowAnyOrigin: process.env.NODE_ENV === "development",
       credentials: true,
       methods: "GET,POST,PUT,DELETE,OPTIONS",
     },
   });
   ```

2. For production, specify allowed origins:

   ```typescript
   enableCors: {
     allowAnyOrigin: false,
     cookieOrigins: [
       'https://yourdomain.com',
       'https://app.yourdomain.com'
     ]
   }
   ```

3. Ensure frontend includes credentials if using cookies:
   ```javascript
   fetch("/api/data", {
     credentials: "include", // For cookies/auth
   });
   ```

## Environment Variables Not Loading

**Symptom**
`process.env` values are `undefined` in your Fastay application.

**Likely Cause**

- `.env` file not loaded
- Wrong variable names
- Environment variables set after app initialization

**How to Resolve**

1. Load dotenv early in your entry file:

   ```typescript
   // src/index.ts
   import "dotenv/config"; // Load .env before anything else
   import { createApp } from "@syntay/fastay";

   void (async () => {
     await createApp({
       /* config */
     });
   })();
   ```

2. Check `.env` file location (should be in project root)
3. Verify variable names match:

   ```bash
   # .env file
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   ```

4. For production, ensure variables are set in your hosting environment

## "Slow Request Detected" Warning

**Symptom**
Console shows warnings like `Slow request detected: /api/users took 1250ms`.

**Likely Cause**

- Database queries taking too long
- External API calls without timeouts
- Complex business logic in route handlers
- Large data processing without streaming

**How to Resolve**

1. Check database query performance:

   ```typescript
   // Add indexes, optimize queries
   const users = await db.users.findMany({
     where: { active: true },
     take: 100, // Limit results
   });
   ```

2. Add timeouts to external requests:

   ```typescript
   const response = await fetch("https://api.example.com/data", {
     signal: AbortSignal.timeout(5000), // 5 second timeout
   });
   ```

3. Move heavy processing to background jobs or services
4. Consider streaming large responses:
   ```typescript
   return {
     stream: createReadStream("/large/file.csv"),
     headers: { "Content-Type": "text/csv" },
   };
   ```

## File Upload Not Working

**Symptom**
File uploads fail or `request.formData()` throws errors.

**Likely Cause**

- Missing `enctype="multipart/form-data"` in form
- File size exceeds limits
- Wrong method to access uploaded files
- Temporary storage permissions

**How to Resolve**

1. Ensure proper form encoding:

   ```html
   <form method="POST" enctype="multipart/form-data">
     <input type="file" name="document" />
   </form>
   ```

2. Use `formData()` method in your route:

   ```typescript
   export async function POST(request: Request) {
     const formData = await request.formData();
     const file = formData.get("document") as File;

     // File properties
     console.log(file.name, file.size, file.type);
   }
   ```

3. Check file object is not null:
   ```typescript
   const file = formData.get("document") as File;
   if (!file || file.size === 0) {
     return { status: 400, body: { error: "No file uploaded" } };
   }
   ```

## Differences Compared to Express Behavior

**Symptom**
Code that works in Express doesn't work in Fastay, or behaves differently.

**Key Differences to Remember**

1. **Route Registration**

   ```typescript
   // Express: Manual registration
   app.get('/api/users', handler);

   // Fastay: Automatic from file structure
   // File: src/api/users/route.ts
   export async function GET(request: Request) { ... }
   ```

2. **Middleware Registration**

   ```typescript
   // Express: app.use() or route-specific
   app.use("/api", middleware);

   // Fastay: Configured in middleware.ts
   export const middleware = createMiddleware({
     "/api": [myMiddleware],
   });
   ```

3. **Response Handling**

   ```typescript
   // Express: Explicit response methods
   res.status(201).json({ data });

   // Fastay: Return values or objects
   return { status: 201, body: { data } };
   // Or simply: return { data };
   ```

4. **Error Handling**

   ```typescript
   // Express: Custom error middleware
   app.use((err, req, res, next) => { ... });

   // Fastay: Through expressOptions
   await createApp({
     expressOptions: {
       errorHandler: (err, req, res, next) => { ... }
     }
   });
   ```

**How to Adapt**

- Follow Fastay's file-based conventions
- Use return values instead of `res.json()` in simple cases
- Configure middleware through the middleware system
- Access request body with `await request.body`

## Common Configuration Issues

### Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:

```typescript
// Change port
await createApp({ port: 5000 });

// Or find available port automatically
await createApp({ port: 0 }); // Fastay will choose a port
```

### TypeScript Compilation Errors

**Symptom**: Server won't start with TypeScript errors.

**Solution**:

1. Run TypeScript compiler separately first:

   ```bash
   npx tsc --noEmit  # Check for errors
   ```

### Hot Reload Not Working

**Symptom**: Changes to route files require server restart.

**Solution**:

1. Use development mode with file watching:

   ```bash
   npm run dev:watch  # If configured
   ```

2. Ensure you're editing files in `src/api/` directory
3. Check that your development setup monitors the correct directories

## Getting More Help

If you encounter issues not covered here:

1. **Check Application Logs**
   - Look for error messages in console output
   - Check for stack traces pointing to specific files

2. **Verify Configuration**
   - Compare with working examples from Fastay documentation
   - Ensure all required options are provided to `createApp`

3. **Simplify to Isolate**
   - Create a minimal test case with just the problematic feature
   - Remove middleware and complex logic to identify the root cause

4. **Review Fastay Examples**
   - Refer to example projects in Fastay repository
   - Check similar use cases in the documentation

Fastay aims to provide clear error messages when possible. Most issues can be resolved by checking configuration, file structure, and ensuring you're following Fastay's conventions rather than Express patterns.
