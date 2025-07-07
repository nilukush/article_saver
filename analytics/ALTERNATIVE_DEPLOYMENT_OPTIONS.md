# Alternative Deployment Options for Metabase

While Railway is recommended (see METABASE_RAILWAY_DEPLOY.md), here are other options:

## Option 1: Render.com (Free Tier)

### PostgreSQL Database
```yaml
# render.yaml for database
databases:
  - name: metabase-db
    plan: free
    databaseName: metabase
    user: metabase
```

### Metabase Web Service
```yaml
services:
  - type: web
    name: metabase
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: MB_DB_TYPE
        value: postgres
      - key: MB_DB_DBNAME
        value: metabase
      - key: MB_DB_HOST
        fromDatabase:
          name: metabase-db
          property: host
```

## Option 2: Docker Compose (Self-Hosted)

```yaml
version: '3.8'
services:
  metabase:
    image: metabase/metabase:latest
    ports:
      - "3000:3000"
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: metabasedb
      MB_DB_PORT: 5432
      MB_DB_USER: metabase
      MB_DB_PASS: ${MB_DB_PASS}
      MB_DB_HOST: postgres
    depends_on:
      - postgres
      
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: metabasedb
      POSTGRES_USER: metabase
      POSTGRES_PASSWORD: ${MB_DB_PASS}
    volumes:
      - metabase-data:/var/lib/postgresql/data

volumes:
  metabase-data:
```

## Option 3: Fly.io
- Similar to Railway but with more geographic distribution options
- Free tier includes 3 shared VMs
- Good for global analytics access

## Option 4: Local Development
See the main README.md for Docker quick start instructions.
