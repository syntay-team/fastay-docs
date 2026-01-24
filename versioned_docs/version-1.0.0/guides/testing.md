---
title: "Testing"
---

# Testing Fastay Applications

Testing ensures your Fastay API works correctly now and continues to work as you make changes. Well-tested applications are more reliable, easier to refactor, and simpler to maintain over time. Fastay's file-based routing and explicit application configuration make it straightforward to set up a test environment.

## Test Types for Fastay

Fastay applications benefit from three types of tests, each serving a different purpose.

**Unit tests** verify individual functions, utilities, and service methods in isolation. They're fast, focused, and don't require the full Fastay application. With Fastay's emphasis on keeping business logic in services rather than route handlers, unit testing becomes particularly clean.

**Integration tests** check that different parts work together. In Fastay, this often means testing route handlers with their dependencies like services or middleware, ensuring the file-based routing system correctly connects your endpoints.

**End-to-end (E2E) tests** verify the complete API works from the client's perspective. These tests make HTTP requests and check responses, ensuring the entire system behaves correctly. Fastay's `createApp` with `mode: 'test'` makes setting up E2E tests straightforward.

## Recommended Test Organization

A common way to organize tests in Fastay applications is to mirror your source structure:

```
__tests__/
├── unit/
│   ├── utils/
│   └── services/
├── integration/
│   └── routes/
└── e2e/
```

This pattern keeps test files close to what they test. For example, `src/api/users/route.ts` would have a corresponding `__tests__/integration/routes/users.test.ts`. However, Fastay doesn't enforce a specific test structure—you can organize tests in whatever way works best for your project.

## Testing Fastay Routes

Fastay provides a test mode that makes route testing straightforward. The `createApp` function accepts a `mode: 'test'` option that configures the application appropriately for testing. Using `port: 0` tells Fastay to use a random available port, avoiding conflicts.

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";

describe("Hello Route", () => {
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

  it("GET /api/hello returns correct response", async () => {
    const response = await request(app).get("/api/hello").expect(200);

    expect(response.body.message).toBe("Hello from Fastay");
  });
});
```

This pattern creates a Fastay application instance specifically for testing, providing clean isolation between test suites.

## Testing Protected Routes

Routes with authentication require setting appropriate headers in tests. The following example assumes you have an existing user in your test database or seed data. In practice, you would typically create test users as part of your test setup.

```typescript
describe("Protected Route", () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    const result = await createApp({
      /* config */
    });
    app = result.app;

    // This assumes you have seeded a test user or created one in setup
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    authToken = loginResponse.body.token;
  });

  it("returns 401 without authentication", async () => {
    await request(app).get("/api/protected/data").expect(401);
  });

  it("returns data with valid token", async () => {
    const response = await request(app)
      .get("/api/protected/data")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
  });
});
```

## Testing Best Practices

**Keep tests independent**. Each test should set up its own data and clean up afterward. Tests shouldn't depend on execution order or leftover state from previous tests.

**Use test fixtures** for creating test data. Factory functions help maintain consistent, reusable test data without repetition.

**Avoid flaky tests** by not relying on external services or network conditions. Mock external APIs and use in-memory or separate test databases for database-dependent tests.

**Test both success and error cases**. Verify your API handles invalid inputs, authentication failures, and edge conditions properly. Fastay's thin route handlers make it easier to test error paths since most business logic lives in services.

**Keep tests focused**. Each test should verify one specific behavior. This makes failures easier to diagnose and tests easier to maintain. Fastay's separation of concerns—with route handlers focusing on HTTP concerns and services handling business logic—makes it natural to write focused tests.

## Running Tests

For Fastay applications, Vitest with Supertest provides a good testing experience. Vitest offers fast execution and TypeScript support, while Supertest handles HTTP request testing. Fastay's straightforward configuration makes it easy to integrate with these tools.

Configure test scripts in your package.json:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Run the full test suite with `npm test`, or use `npm run test:watch` during development to run tests automatically as you make changes.

Testing Fastay applications follows standard backend testing patterns, with Fastay's file-based routing and explicit application configuration making test setup particularly straightforward. The framework's emphasis on keeping route handlers thin and business logic in services leads to cleaner, more maintainable test suites.
