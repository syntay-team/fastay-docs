module.exports = {
  docsSidebar: [
    "introduction",
    "getting-started",
    "philosophy",

    {
      type: "category",
      label: "Core Concepts",
      items: [
        "core-concepts/overview",
        "core-concepts/routing",
        "core-concepts/middleware",
        "core-concepts/request-response",
        "core-concepts/error-handling",
        "core-concepts/file-structure",
      ],
    },

    {
      type: "category",
      label: "Guides",
      items: [
        "guides/overview",
        "guides/creating-api",
        "guides/authentication",
        "guides/database-integration",
        "guides/testing",
        "guides/deployment",
        "guides/migration-from-express",
      ],
    },

    {
      type: "category",
      label: "Advanced",
      items: [
        "advanced/custom-middleware",
        "advanced/performance",
        "advanced/security",
        "advanced/monitoring",
        "advanced/plugin-system",
      ],
    },

    {
      type: "category",
      label: "Recipes",
      items: [
        "recipes/rest-api",
        "recipes/file-upload",
        "recipes/real-time",
        "recipes/graphql",
        "recipes/microservices",
      ],
    },

    {
      type: "category",
      label: "API Reference",
      items: [
        "api-reference/create-app",
        "api-reference/request-object",
        "api-reference/response-object",
        "api-reference/middleware-api",
      ],
    },

    "troubleshooting",
  ],

  apiSidebar: [
    {
      type: "category",
      label: "API Reference",
      items: [
        "api-reference/create-app",
        "api-reference/request-object",
        "api-reference/response-object",
        "api-reference/middleware-api",
      ],
    },
  ],
};
