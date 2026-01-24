---
title: "Creating Your First API"
---

# Creating Your First API with Fastay

This guide walks you through building a complete Task Management API using Fastay. You'll learn the framework's core patterns through practical implementation, focusing on Fastay's native abstractions rather than external dependencies.

## What You'll Build

You'll create a production-ready Task Management API with:

- Complete CRUD operations for tasks
- Input validation and error handling
- Pagination and filtering
- API documentation
- Testing
- Deployment configuration

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Basic TypeScript knowledge
- Understanding of HTTP fundamentals

## Step 1: Project Setup

### 1.1 Create a New Fastay Project

```bash
npx fastay create-app task-manager-api
cd task-manager-api
```

This creates a Fastay project with the following structure:

```
task-manager-api/
├── src/
│   ├── api/
│   ├── middlewares/
│   ├── services/
│   ├── utils/
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 1.2 Configure the Application

Update `src/index.ts` to set up your Fastay application:

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";

void (async () => {
  await createApp({
    port: process.env.PORT || 5000,
    apiDir: "./src/api",
    baseRoute: "/api",
    enableCors: {
      allowAnyOrigin: true,
      methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      headers: "Content-Type, Authorization, X-Custom-Header",
      exposedHeaders: "X-Custom-Header",
      maxAge: 86400,
    },
  });
})();
```

## Step 2: Building Your First Route

### 2.1 Create the Tasks Route

Create `src/api/tasks/route.ts`:

```typescript
// src/api/tasks/route.ts
import { Request } from "@syntay/fastay";

// In-memory storage for demonstration
// In a real application, replace with your database of choice
const tasks: any[] = [];
let nextId = 1;

// GET /api/tasks - List all tasks
export async function GET(request: Request) {
  const { completed, priority, page = "1", limit = "10" } = request.query;

  // Build filter conditions
  let filteredTasks = [...tasks];

  if (completed !== undefined) {
    filteredTasks = filteredTasks.filter(
      (task) => task.completed === (completed === "true"),
    );
  }

  if (priority) {
    filteredTasks = filteredTasks.filter((task) => task.priority === priority);
  }

  // Calculate pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;

  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  return {
    tasks: paginatedTasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredTasks.length,
      totalPages: Math.ceil(filteredTasks.length / limitNum),
      hasNext: endIndex < filteredTasks.length,
      hasPrev: startIndex > 0,
    },
  };
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  const taskData = await request.body;

  // Basic validation
  if (!taskData.title || taskData.title.trim().length === 0) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Title is required",
        field: "title",
      },
    };
  }

  // Create task with generated ID
  const task = {
    id: nextId++,
    title: taskData.title,
    description: taskData.description || null,
    completed: false,
    dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
    priority: taskData.priority || "medium",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tasks.push(task);

  return {
    status: 201, // Created
    body: {
      message: "Task created successfully",
      task,
    },
  };
}
```

### 2.2 Test Your First Route

Start the development server:

```bash
npm run dev
```

Test your API:

```bash
# Create a new task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Fastay",
    "description": "Complete the Fastay tutorial",
    "priority": "high"
  }'

# List all tasks
curl http://localhost:5000/api/tasks
```

## Step 3: Implementing CRUD Operations

### 3.1 Create Individual Task Routes

Create `src/api/tasks/[id]/route.ts`:

```typescript
// src/api/tasks/[id]/route.ts
import { Request } from "@syntay/fastay";

// Shared in-memory storage (in real app, use database)
const tasks: any[] = [];

// Helper function to find task by ID
function findTaskById(id: string) {
  const taskId = parseInt(id);
  return tasks.find((task) => task.id === taskId);
}

// GET /api/tasks/:id - Get a specific task
export async function GET(request: Request) {
  const { id } = request.params;
  const task = findTaskById(id as string);

  if (!task) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  return { task };
}

// PUT /api/tasks/:id - Update a task completely
export async function PUT(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(id as string),
  );

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  const updateData = await request.body;

  // Validation
  if (!updateData.title || updateData.title.trim().length === 0) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Title is required",
        field: "title",
      },
    };
  }

  // Update task
  const updatedTask = {
    ...tasks[taskIndex],
    ...updateData,
    updatedAt: new Date(),
  };

  tasks[taskIndex] = updatedTask;

  return {
    body: {
      message: "Task updated successfully",
      task: updatedTask,
    },
  };
}

// PATCH /api/tasks/:id - Partially update a task
export async function PATCH(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(id as string),
  );

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  const updateData = await request.body;
  const updatedTask = {
    ...tasks[taskIndex],
    ...updateData,
    updatedAt: new Date(),
  };

  tasks[taskIndex] = updatedTask;

  return {
    body: {
      message: "Task partially updated successfully",
      task: updatedTask,
    },
  };
}

// DELETE /api/tasks/:id - Delete a task
export async function DELETE(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(id as string),
  );

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  tasks.splice(taskIndex, 1);

  return {
    body: {
      message: "Task deleted successfully",
    },
  };
}
```

## Step 4: Adding Validation and Error Handling

### 4.1 Create Validation Utilities

Create `src/utils/validation.ts`:

```typescript
// src/utils/validation.ts
import { z } from "zod";

// Task validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  completed: z.boolean().default(false),
});

export const taskQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

### 4.2 Update Routes with Validation

Update `src/api/tasks/route.ts`:

```typescript
// src/api/tasks/route.ts (updated)
import { Request } from "@syntay/fastay";
import { createTaskSchema, taskQuerySchema } from "@/utils/validation";

// In-memory storage
type Task = {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const tasks: Task[] = [];

let nextId = 1;

// GET /api/tasks - List all tasks with validation
export async function GET(request: Request) {
  try {
    // Validate query parameters
    const validatedQuery = taskQuerySchema.parse(request.query);
    const { completed, priority, page, limit } = validatedQuery;

    // Filter tasks
    let filteredTasks = [...tasks];

    if (completed !== undefined) {
      filteredTasks = filteredTasks.filter(
        (task) => task.completed === (completed === "true"),
      );
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(
        (task) => task.priority === priority,
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTasks = filteredTasks.slice(startIndex, endIndex as number);

    return {
      tasks: paginatedTasks,
      pagination: {
        page,
        limit,
        total: filteredTasks.length,
        totalPages: Math.ceil(filteredTasks.length / limit),
        hasNext: endIndex < filteredTasks.length,
        hasPrev: startIndex > 0,
      },
    };
  } catch (error) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
      },
    };
  }
}

// POST /api/tasks - Create a new task with validation
export async function POST(request: Request) {
  try {
    // Validate request body
    const taskData = createTaskSchema.parse(await request.body);

    // Create task
    const task: Task = {
      id: nextId++,
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(task);

    return {
      status: 201,
      body: {
        message: "Task created successfully",
        task,
      },
    };
  } catch (error) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Invalid task data",
      },
    };
  }
}

// PUT /api/tasks/:id - Update a task completely
export async function PUT(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex((task) => task.id === Number(id));

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  try {
    const updateData = createTaskSchema.parse(await request.body);

    const updatedTask = {
      ...tasks[taskIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    tasks[taskIndex] = updatedTask;

    return {
      body: {
        message: "Task updated successfully",
        task: updatedTask,
      },
    };
  } catch {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Invalid task data",
      },
    };
  }
}

// PATCH /api/tasks/:id - Partially update a task
export async function PATCH(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex((task) => task.id === Number(id));

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  try {
    const updateData = updateTaskSchema.parse(await request.body);

    const updatedTask = {
      ...tasks[taskIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    tasks[taskIndex] = updatedTask;

    return {
      body: {
        message: "Task partially updated successfully",
        task: updatedTask,
      },
    };
  } catch {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "Invalid task data",
      },
    };
  }
}

// DELETE /api/tasks/:id - Delete a task
export async function DELETE(request: Request) {
  const { id } = request.params;
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(id as string),
  );

  if (taskIndex === -1) {
    return {
      status: 404,
      body: {
        error: "NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  tasks.splice(taskIndex, 1);

  return {
    body: {
      message: "Task deleted successfully",
    },
  };
}
```

## Step 5: Adding API Documentation

### 5.1 Set Up Basic API Documentation

Create `src/middlewares/docs.ts` for simple API documentation:

```typescript
// src/middlewares/docs.ts
import { Request, Response, Next } from "@syntay/fastay";

export function apiDocs(request: Request, response: Response, next: Next) {
  if (request.path === "/api-docs") {
    const docs = {
      name: "Task Manager API",
      version: "1.0.0",
      description: "A Task Management API built with Fastay",
      endpoints: {
        tasks: {
          GET: "/api/tasks",
          POST: "/api/tasks",
          "GET by ID": "/api/tasks/:id",
          "PUT by ID": "/api/tasks/:id",
          "PATCH by ID": "/api/tasks/:id",
          "DELETE by ID": "/api/tasks/:id",
        },
      },
    };

    return response.json(docs);
  }

  next();
}
```

### 5.2 The middlewares will appear

Update `src/middlewares/middleware.ts` to include documentation:

```typescript
// src/middlewares/middleware.ts
import { createMiddleware } from "@syntay/fastay";
import { apiDocs } from "./docs";

export const middleware = createMiddleware({
  // Apply logger to all routes
  "/api/api-docs": [apiDocs],
});
```

## Step 6: Testing Your API

### 6.1 Create Simple Tests

Create `tests/tasks.test.ts`:

```typescript
// tests/tasks.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";

describe("Tasks API", () => {
  let app: any;

  beforeEach(async () => {
    app = await createApp({
      port: 0, // Let system choose port
      apiDir: "./src/api",
      baseRoute: "/api",
      mode: "test",
    });
  });

  describe("GET /api/tasks", () => {
    it("should return empty array when no tasks exist", async () => {
      const response = await request(app).get("/api/tasks");
      expect(response.status).toBe(200);
      expect(response.body.tasks).toEqual([]);
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a new task", async () => {
      const taskData = {
        title: "Test Task",
        description: "Test description",
        priority: "high",
      };

      const response = await request(app).post("/api/tasks").send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.task.title).toBe(taskData.title);
    });

    it("should return validation error for empty title", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });
  });
});
```

## Step 7: Production Readiness

### 7.1 Environment Configuration

Create `.env` file:

```env
PORT=5000
NODE_ENV=development
```

Update `src/index.ts` for production:

```typescript
// src/index.ts (production-ready)
import { createApp } from "@syntay/fastay";
import "dotenv/config";

void (async () => {
  await createApp({
    port: process.env.PORT || 5000,
    apiDir: "./src/api",
    baseRoute: "/api",
    enableCors: {
      allowAnyOrigin: true,
      methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      headers: "Content-Type, Authorization, X-Custom-Header",
      exposedHeaders: "X-Custom-Header",
      maxAge: 86400,
    },
  });
})();
```

### 7.2 Health Check Endpoint

Create `src/api/health/route.ts`:

```typescript
// src/api/health/route.ts
export async function GET() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}
```

## Step 8: Database Integration Note

**Important**: Fastay is database-agnostic and works with any database client. The examples above use in-memory storage for simplicity. In a real application, you would replace this with your preferred database solution.

### Database Options with Fastay:

- **Prisma**: Modern ORM with TypeScript support
- **Drizzle**: Type-safe SQL query builder
- **Knex**: SQL query builder with migrations
- **Mongoose**: MongoDB object modeling
- **Raw SQL**: Direct database drivers (pg, mysql2, etc.)

### Example with Database Abstraction:

```typescript
// Example service layer (src/services/task-service.ts)
export class TaskService {
  // This is a placeholder - replace with actual database calls
  async findMany(filters: any) {
    // return await database.tasks.findMany({ where: filters });
    throw new Error("Implement with your database client");
  }

  async create(data: any) {
    // return await database.tasks.create({ data });
    throw new Error("Implement with your database client");
  }
}
```

## Next Steps

You've built a complete API with Fastay. To continue your learning:

1. **[Add Authentication](./authentication.md)**: Implement JWT-based authentication middleware
2. **[Database Integration](./database-integration.md)**: Connect to PostgreSQL, MongoDB, or your preferred database
3. **[File Uploads](../recipes/file-upload.md)**: Handle file uploads with Fastay's FormData support
4. **[Real-time Features](../recipes/real-time.md)**: Add WebSocket support for live updates

## Summary

In this guide, you learned:

- How to create a Fastay project from scratch
- Fastay's file-based routing system
- How to implement CRUD operations with validation
- Fastay's approach to error handling
- How to structure your application for production
- Fastay's database-agnostic architecture

> _**Remember:** That Fastay focuses on simplicity and developer experience. The framework provides sensible defaults while allowing flexibility for advanced use cases through Express.js interoperability when needed._
