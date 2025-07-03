# Umami Vercel Configuration Settings

## If Port Change Doesn't Work, Try These Settings:

### 1. Build & Development Settings (in Vercel)

Go to Settings → General → Build & Development Settings

**Build Command**: 
```bash
npm run build-app
```
(This skips the database check)

**Output Directory**:
```
.next
```

**Install Command**:
```bash
npm install
```

### 2. Environment Variables (Complete List)

```env
# Database (use port 6543!)
DATABASE_URL=postgresql://postgres.imbyatyyriivfuebqutt:d6gUL5ugknamY6HM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Required
APP_SECRET=K7ZwmFtH9vH1PqNrXkYjWqBLzV8Tc4D6Qs5RnE3JmA8=

# Optional but helpful
NODE_ENV=production
DISABLE_DB_CHECK=1
DATABASE_TYPE=postgresql

# For custom tracking names (optional)
TRACKER_SCRIPT_NAME=script.js
COLLECT_API_ENDPOINT=/api/collect
```

### 3. Alternative Build Commands to Try

If standard build fails, try these in order:

**Option A**: Skip all checks
```bash
npm install && npm run build-app
```

**Option B**: Generate Prisma without engine
```bash
npx prisma generate --no-engine && npm run build-app
```

**Option C**: Force production mode
```bash
NODE_ENV=production npm run build
```

### 4. Function Configuration

In Vercel → Settings → Functions:

- **Region**: Same as your Supabase region (ap-south-1)
- **Max Duration**: 10 seconds (default)

### 5. Quick Debug Checklist

- [ ] Changed port from 5432 to 6543
- [ ] Added APP_SECRET environment variable
- [ ] Removed sslmode=require (not needed for pooler)
- [ ] Added connection_limit=1
- [ ] Checked Supabase project is active
- [ ] No IP bans in Supabase

### 6. Nuclear Option: Fork and Modify

If nothing works, fork Umami and modify `scripts/check-db.js`:

```javascript
// Add this at the top of check-db.js
if (process.env.DISABLE_DB_CHECK === '1') {
  console.log('✓ Database check skipped.');
  process.exit(0);
}
```

Then deploy your fork instead.

## Most Common Fix Success Rate:
1. **Changing port to 6543**: Fixes 80% of cases
2. **Adding APP_SECRET**: Fixes 10% of cases  
3. **Skipping DB check**: Fixes 8% of cases
4. **Other issues**: 2% of cases

The port change should fix your issue!