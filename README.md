# Fastay Docs Website

Official documentation website for the **Fastay Framework**.

Website: **[https://fastay.syntay.site](https://fastay.syntay.site)**

This repository contains the source code for the documentation site, built with **Docusaurus**.

---

## Requirements

* Node.js (recommended: v20+)
* Yarn (or npm)

---

## Installation

```bash
yarn
```

---

## Local Development

```bash
yarn start
```

Starts a local development server and opens the site in your browser. Most changes are reflected live without restarting the server.

---

## Build

```bash
yarn build
```

Generates static content into the `build` directory. The output can be served using any static hosting service.

---

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<your-github-username> yarn deploy
```

If you are using GitHub Pages, this command builds the website and pushes it to the `gh-pages` branch.
