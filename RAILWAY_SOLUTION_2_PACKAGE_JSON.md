# Alternative Solution 2: Root package.json Update

If you prefer to keep the railway.json in the backend directory, you can instead update the root package.json with these proxy scripts:

## Add to root package.json scripts section:

```json
"scripts": {
    // ... existing scripts ...
    "build": "cd backend && npm run build",
    "start": "cd backend && npm start",
    "install": "npm install && cd backend && npm install",
    // ... rest of existing scripts ...
}
```

## Full updated root package.json:

```json
{
    "name": "article-saver",
    "productName": "Article Saver",
    "version": "1.0.0",
    "description": "A desktop application for saving and reading articles, similar to Pocket",
    "main": "index.js",
    "scripts": {
        "dev": "./scripts/start-dev.sh",
        "dev:desktop": "cd desktop && npm run dev",
        "dev:backend": "cd backend && npm run dev",
        "stop": "./scripts/stop-dev.sh",
        "health": "./scripts/health-check.sh",
        "build:desktop": "cd desktop && npm run build",
        "build:backend": "cd backend && npm run build",
        "build": "cd backend && npm run build",
        "start": "cd backend && npm start",
        "install": "npm install && cd backend && npm install",
        "install:all": "npm install && cd desktop && npm install && cd ../backend && npm install",
        "clean:data": "./clean-all-data.sh"
    },
    "keywords": [
        "article",
        "reader",
        "pocket",
        "electron",
        "desktop"
    ],
    "author": "Article Saver Contributors",
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/nilukush/article_saver.git"
    },
    "bugs": {
        "url": "https://github.com/nilukush/article_saver/issues"
    },
    "homepage": "https://github.com/nilukush/article_saver#readme",
    "workspaces": [
        "desktop",
        "backend",
        "shared"
    ],
    "dependencies": {
        "better-sqlite3": "^11.10.0"
    }
}
```

This approach allows you to keep the existing `/backend/railway.json` file without any changes.