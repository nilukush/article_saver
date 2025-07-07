#!/bin/bash

echo "📊 Analytics Documentation Consolidation Script"
echo "=============================================="
echo ""
echo "This script will:"
echo "1. Extract unique content from duplicate files"
echo "2. Consolidate everything in /analytics folder"
echo "3. Remove duplicates from root directory"
echo ""

# Check what unique content exists in root files
echo "🔍 Analyzing unique content in root files..."
echo ""

# Extract unique deployment options from METABASE_SETUP_GUIDE.md
if [ -f "METABASE_SETUP_GUIDE.md" ]; then
    echo "Found METABASE_SETUP_GUIDE.md with additional deployment options"
    
    # Create alternative deployments file with unique content
    cat > analytics/ALTERNATIVE_DEPLOYMENT_OPTIONS.md << 'EOF'
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
EOF
    echo "✅ Created analytics/ALTERNATIVE_DEPLOYMENT_OPTIONS.md"
fi

# Move ANALYTICS_IMPLEMENTATION_PLAN.md to analytics folder
if [ -f "ANALYTICS_IMPLEMENTATION_PLAN.md" ]; then
    echo ""
    echo "📁 Moving ANALYTICS_IMPLEMENTATION_PLAN.md to analytics folder..."
    mv ANALYTICS_IMPLEMENTATION_PLAN.md analytics/IMPLEMENTATION_PLAN.md
    echo "✅ Moved to analytics/IMPLEMENTATION_PLAN.md"
fi

# Remove duplicate files
echo ""
echo "🗑️  Removing duplicate files from root..."

if [ -f "METABASE_SETUP_GUIDE.md" ]; then
    rm METABASE_SETUP_GUIDE.md
    echo "  ✅ Removed METABASE_SETUP_GUIDE.md"
fi

if [ -f "analytics_queries.sql" ]; then
    rm analytics_queries.sql
    echo "  ✅ Removed analytics_queries.sql (wrong schema)"
fi

# Update analytics/README.md to reference correct files
echo ""
echo "📝 Updating analytics/README.md..."
sed -i.bak 's|analytics_queries.sql|metabase_queries.sql|g' analytics/README.md 2>/dev/null
rm analytics/README.md.bak 2>/dev/null

# Remove the file guide as it's no longer needed
if [ -f "analytics/ANALYTICS_FILE_GUIDE.md" ]; then
    rm analytics/ANALYTICS_FILE_GUIDE.md
    echo "  ✅ Removed ANALYTICS_FILE_GUIDE.md (no longer needed)"
fi

# Show final structure
echo ""
echo "✅ Consolidation complete!"
echo ""
echo "📁 Final analytics structure:"
echo "analytics/"
ls -1 analytics/ | awk '{print "├── " $0}'
echo ""

# Git tracking recommendation
echo "📌 Add to git tracking:"
echo "git add analytics/"
echo "git commit -m \"feat: add comprehensive analytics documentation with Metabase setup\""
echo ""

echo "🎯 Start here: analytics/README.md"
echo ""
echo "The analytics folder now contains:"
echo "- README.md: Overview and quick start"
echo "- IMPLEMENTATION_PLAN.md: Phased rollout strategy"
echo "- METABASE_RAILWAY_DEPLOY.md: Primary deployment guide"
echo "- ALTERNATIVE_DEPLOYMENT_OPTIONS.md: Other deployment methods"
echo "- metabase_queries.sql: 20+ production-ready queries"