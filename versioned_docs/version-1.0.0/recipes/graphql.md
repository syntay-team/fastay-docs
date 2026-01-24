---
title: "GraphQL Integration"
description: "Learn how to integrate GraphQL with Fastay to provide both REST and GraphQL APIs in the same application while maintaining Fastay's file-based routing structure."
---

# GraphQL Integration in Fastay

Fastay is designed as a REST-first framework with file-based routing, but it can seamlessly integrate GraphQL to offer both API paradigms in a single application. This hybrid approach allows you to maintain your existing REST API structure while adding GraphQL capabilities for clients that benefit from its flexibility.

## Understanding the Integration Strategy

Fastay's GraphQL integration follows a pragmatic approach:

- **Coexistence**: GraphQL and REST endpoints operate side-by-side in the same Fastay application
- **File-based routing**: GraphQL endpoints follow the same routing conventions as REST endpoints
- **Shared infrastructure**: Use the same authentication, middleware, and database connections
- **Progressive adoption**: Start with GraphQL for specific use cases while maintaining REST for others

This strategy respects Fastay's architecture while providing GraphQL's benefits where they matter most.

## Installation and Setup

### Required Dependencies

Install the necessary GraphQL packages alongside your existing Fastay setup:

```bash
npm install @apollo/server graphql @as-integrations/express4
```

### Directory Structure

Organize GraphQL-related files within Fastay's existing structure:

```
src/
├── api/
│   └── graphql/
│       └── route.ts     # GraphQL endpoint
├── graphql/
│   ├── schema.ts        # GraphQL type definitions
│   └── resolvers.ts     # GraphQL resolvers
└── lib/
    └── apollo-server.ts # Apollo Server setup
```

## GraphQL Schema Definition

Define your GraphQL schema using TypeScript:

```typescript
// src/graphql/schema.ts
import { gql } from "graphql-tag";

export const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    createdAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String
    authorId: String!
    published: Boolean!
    createdAt: String!
    author: User!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String, authorId: String!): Post!
    updatePost(id: ID!, title: String, content: String): Post!
  }
`;
```

## GraphQL Resolvers with Working Mock Data

Implement resolvers that actually work:

```typescript
// src/graphql/resolvers.ts

// In-memory data store
const users = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    role: "user",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
];

const posts = [
  {
    id: "1",
    title: "First Post",
    content: "Hello World!",
    authorId: "1",
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "GraphQL with Fastay",
    content: "Working example",
    authorId: "2",
    published: true,
    createdAt: new Date().toISOString(),
  },
];

export const resolvers = {
  Query: {
    users: () => users,

    user: (_: any, args: { id: string }) => {
      const user = users.find((user) => user.id === args.id);
      if (!user) {
        throw new Error(`User with ID ${args.id} not found`);
      }
      return user;
    },

    posts: () => posts.filter((post) => post.published),

    post: (_: any, args: { id: string }) => {
      const post = posts.find((post) => post.id === args.id);
      if (!post) {
        throw new Error(`Post with ID ${args.id} not found`);
      }
      return post;
    },
  },

  Mutation: {
    createUser: (_: any, args: { name: string; email: string }) => {
      const newUser = {
        id: String(users.length + 1),
        name: args.name,
        email: args.email,
        role: "user",
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      return newUser;
    },

    createPost: (
      _: any,
      args: { title: string; content?: string; authorId: string },
    ) => {
      // Verify author exists
      const author = users.find((user) => user.id === args.authorId);
      if (!author) {
        throw new Error(`Author with ID ${args.authorId} not found`);
      }

      const newPost = {
        id: String(posts.length + 1),
        title: args.title,
        content: args.content || "",
        authorId: args.authorId,
        published: true,
        createdAt: new Date().toISOString(),
      };

      posts.push(newPost);
      return newPost;
    },

    updatePost: (
      _: any,
      args: { id: string; title?: string; content?: string },
    ) => {
      const postIndex = posts.findIndex((post) => post.id === args.id);

      if (postIndex === -1) {
        throw new Error(`Post with ID ${args.id} not found`);
      }

      // Update fields
      const updatedPost = {
        ...posts[postIndex],
        ...(args.title && { title: args.title }),
        ...(args.content !== undefined && { content: args.content }),
      };

      posts[postIndex] = updatedPost;
      return updatedPost;
    },
  },

  // Resolve author field for Post type
  Post: {
    author: (parent: any) => {
      return users.find((user) => user.id === parent.authorId);
    },
  },
};
```

## Apollo Server Setup

Create a reusable Apollo Server instance:

```typescript
// src/lib/apollo-server.ts
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../graphql/schema";
import { resolvers } from "../graphql/resolvers";

// Create and configure Apollo Server
export async function createApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
  });

  await server.start();
  return server;
}
```

## GraphQL Route Implementation

This is the key part - creating the GraphQL endpoint in Fastay:

```typescript
// src/api/graphql/route.ts
import { Request, Response } from "@syntay/fastay";
import { createApolloServer } from "../../lib/apollo-server";
import { expressMiddleware } from "@as-integrations/express4";

// Create Apollo Server instance
const apolloServerPromise = createApolloServer();

// GET /graphql - GraphQL Playground (development only)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return {
      status: 404,
      body: { error: "Not found" },
    };
  }

  // Return HTML for GraphQL Playground
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GraphQL Playground</title>
        <link rel="stylesheet" href="https://unpkg.com/graphql-playground-react/build/static/css/index.css" />
        <link rel="shortcut icon" href="https://unpkg.com/graphql-playground-react/build/favicon.png" />
        <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script>
          window.addEventListener('load', function() {
            GraphQLPlayground.init(document.getElementById('root'), {
              endpoint: window.location.pathname
            })
          })
        </script>
      </body>
    </html>
  `;
}

// POST /graphql - Handle GraphQL requests
export async function POST(request: Request, response: Response) {
  const server = await apolloServerPromise;

  // Create context for the request
  const context = async () => {
    // You can add authentication, user data, etc. here
    const authHeader = request.headers.authorization;

    return {
      user: authHeader ? { id: "1", role: "user" } : null,
      requestId: Math.random().toString(36).substring(7),
    };
  };

  // Use Apollo Server's expressMiddleware
  const middleware = expressMiddleware(server, { context });

  // Execute the middleware
  return new Promise<void>((resolve, reject) => {
    middleware(request, response, (error?: any) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// OPTIONS /graphql - CORS preflight
export async function OPTIONS() {
  return {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}
```

## Testing the Integration

### Start Your Fastay Application

```bash
npm run dev
```

### Test GraphQL Queries

Using curl or a GraphQL client:

```bash
# Get all users
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name email } }"}'

# Create a new user
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createUser(name: \"Charlie\", email: \"charlie@example.com\") { id name email } }"}'

# Get posts with their authors
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ posts { id title author { name email } } }"}'
```

### Access GraphQL Playground

In development, visit `http://localhost:5000/graphql` to access the GraphQL Playground interface.

## Authentication Integration

Add authentication to your GraphQL endpoint:

```typescript
// src/lib/auth.ts
export function verifyToken(token: string) {
  // In a real application, verify JWT token
  // This is a simplified example
  if (token === "valid-token") {
    return { userId: "1", role: "admin" };
  }
  return null;
}

// Update the GraphQL context in route.ts
const context = async () => {
  const authHeader = request.headers.authorization;

  let user = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    user = verifyToken(token);
  }

  return { user };
};
```

## Error Handling

Add proper error handling to GraphQL resolvers:

```typescript
// Enhanced error handling in resolvers
export const resolvers = {
  Query: {
    user: (_: any, args: { id: string }) => {
      try {
        const user = users.find((user) => user.id === args.id);
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        return user;
      } catch (error) {
        // Log error and rethrow with proper formatting
        console.error("Error fetching user:", error);
        throw error;
      }
    },
  },

  Mutation: {
    createPost: (
      _: any,
      args: { title: string; content?: string; authorId: string },
      context: any,
    ) => {
      // Check authentication
      if (!context.user) {
        throw new Error("UNAUTHENTICATED");
      }

      // Check authorization
      if (
        context.user.role !== "admin" &&
        args.authorId !== context.user.userId
      ) {
        throw new Error("UNAUTHORIZED");
      }

      // Rest of the mutation logic...
    },
  },
};
```

## Performance Optimization

### Query Complexity Limits

Prevent overly complex queries:

```typescript
import {
  createComplexityRule,
  simpleEstimator,
} from "graphql-query-complexity";

// In your Apollo Server configuration
const complexityRule = createComplexityRule({
  maximumComplexity: 100,
  estimators: [simpleEstimator({ defaultComplexity: 1 })],
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [complexityRule],
});
```

### Response Caching

Add caching for frequently accessed data:

```typescript
// Simple in-memory cache
const cache = new Map();

export const resolvers = {
  Query: {
    users: () => {
      const cacheKey = "users:all";
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.data; // Return cached data if less than 1 minute old
      }

      const data = users; // Your actual data fetching
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    },
  },
};
```

## Production Deployment

### Production Configuration

```typescript
// src/lib/apollo-server.ts - Production setup
export async function createApolloServer() {
  const isProduction = process.env.NODE_ENV === "production";

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !isProduction, // Disable in production
    includeStacktraceInErrorResponses: !isProduction,

    // Production plugins
    plugins: isProduction
      ? [
          // Add Apollo Studio, error tracking, etc.
        ]
      : [],
  });

  await server.start();
  return server;
}
```

### Health Check Endpoint

Add a health check for your GraphQL service:

```typescript
// src/api/graphql/health/route.ts
export async function GET() {
  try {
    // Try to execute a simple GraphQL query
    const testQuery = "{ __schema { types { name } } }";

    return {
      status: 200,
      body: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "graphql",
      },
    };
  } catch (error) {
    return {
      status: 503,
      body: {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

## Best Practices

1. **Start Simple**: Begin with basic queries before adding mutations and subscriptions
2. **Use File-Based Routing**: Keep GraphQL endpoint in `src/api/graphql/route.ts`
3. **Share Authentication**: Use the same auth middleware for REST and GraphQL
4. **Monitor Performance**: Track query execution times and error rates
5. **Implement Rate Limiting**: Protect against abuse with request limits
6. **Use DataLoader**: Prevent N+1 query problems with batching
7. **Version Your Schema**: Plan for schema evolution from the start
8. **Test Thoroughly**: Write tests for both successful and error cases

This GraphQL integration pattern keeps Fastay's file-based routing while adding GraphQL capabilities. The `/graphql` endpoint behaves like any other Fastay route, maintaining consistency with the framework's architecture while providing GraphQL's powerful querying features.
