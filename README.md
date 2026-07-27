# Rekadigi Assessment API

Backend API for vehicle marketplace data, built with NestJS + PostgreSQL.

## Features

- Category tree management (nested categories via PostgreSQL ltree)
- Listing CRUD with soft delete
- Listing filters, search, and suggestions
- Category facets (available listing counts)
- Swagger docs

## Tech Stack

- Node.js 24
- NestJS 11
- PostgreSQL 17
- pnpm
- Docker Compose

## Prerequisites

- Node.js 24+
- pnpm (via Corepack)
- Docker + Docker Compose
- PostgreSQL client tools (psql) for manual schema/seed import

## Environment Variables

The app reads these variables:

- DATABASE_HOST
- DATABASE_PORT
- DATABASE_USER
- DATABASE_PASSWORD
- DATABASE_NAME
- PORT

For local development (app on host machine + postgres in docker), use:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=my_database
PORT=3000
```

## Install Dependencies

```bash
pnpm install
```

## Run with Docker

Production-style container setup:

```bash
docker compose up --build
```

Development watch mode (source mounted, hot reload):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Stop containers:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Run App Locally (Without App Container)

1. Start PostgreSQL only:

```bash
docker compose up -d db
```

2. Configure environment variables for localhost DB.

3. Start app:

```bash
pnpm run start:dev
```

## Database Initialization

Apply schema:

```bash
psql -h localhost -U postgres -d my_database -f db.sql
```

Insert seed data:

```bash
psql -h localhost -U postgres -d my_database -f seeder.sql
```

Note: db.sql creates required extensions (pgcrypto, ltree) and tables including categories, vehicles, and vehicle_images.

## API Docs

- Swagger UI: http://localhost:3000/api-docs
- Health check: GET http://localhost:3000/

## Main Endpoints

### Categories

- POST /categories
- GET /categories
- GET /categories/:id
- PATCH /categories/:id
- GET /categories/:id/listings

### Listings

- POST /listings
- GET /listings
- GET /listings/:id
- PATCH /listings/:id
- DELETE /listings/:id
- GET /listings/filter-attributes?categoryId=<uuid>
- GET /listings/search/suggestions?search=<term>&limit=5

### Filters

- GET /filters
- GET /filters/:id

## Query Examples

Listings with search + filters:

```http
GET /listings?page=1&limit=10&sortBy=createdAt&sortOrder=desc&search=honda&filters={"minPrice":100000000,"maxPrice":500000000}
```

Category listings:

```http
GET /categories/:id/listings?page=1&limit=10&filters={"condition":"used"}
```

## Scripts

```bash
pnpm run start
pnpm run start:dev
pnpm run start:prod
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```
