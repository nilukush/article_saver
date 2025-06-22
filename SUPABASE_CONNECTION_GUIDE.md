# 🔗 Supabase Database Connection URL Guide

## 📍 Quick Answer: Where to Find Your Database URL

### Method 1: Via Connect Button (Current Method - 2024)

1. **Log in to Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Click the "Connect" Button**
   - Look at the **top navigation bar**
   - You'll see a green **"Connect"** button
   - Click it to open connection details

3. **Select Connection Type**
   - **Direct connection** (Recommended for Railway)
   - Session pooler
   - Transaction pooler

4. **Copy the Connection String**
   - It will look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

### Method 2: Via Settings (Alternative)

1. **Navigate to Project Settings**
   - Select your project
   - Click **"Settings"** in the left sidebar
   - Click **"Database"** submenu

2. **Find Connection Info**
   - Look for **"Connection string"** section
   - **IMPORTANT**: If you don't see it, change source from "Read replica" to **"Primary database"**

## 🚨 Common Issues & Solutions

### Issue: Connection String Not Showing
**Solution**: Make sure **"Primary database"** is selected as the source (not "Read replica")

### Issue: Which Connection Type to Use?
**For Railway Deployment**: Use **Direct connection** with these settings:
- Port: 5432
- SSL Mode: require
- Connection: Direct (not pooled)

## 📋 Connection String Format Breakdown

```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require
```

- **USERNAME**: Usually `postgres`
- **PASSWORD**: The database password you set
- **HOST**: Something like `aws-0-us-west-1.pooler.supabase.com`
- **PORT**: `5432` for direct connection
- **DATABASE**: Usually `postgres`

## 🔐 Security Best Practices

1. **Never commit the connection string to Git**
2. **Use environment variables** (Railway will handle this)
3. **Enable SSL** (add `?sslmode=require` to the URL)
4. **Use connection pooling** for production apps

## 📱 What Your Connection String Should Look Like

### For Direct Connection (Recommended for Railway):
```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### For Pooled Connection (If needed):
```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 🎯 Step-by-Step for Article Saver Deployment

1. **Get the Connection String**:
   - Click "Connect" button in Supabase
   - Choose "Direct connection"
   - Copy the entire connection string

2. **Prepare for Railway**:
   - The deployment script will ask for this URL
   - Paste the complete URL when prompted
   - Railway will securely store it as an environment variable

3. **Verify the Connection**:
   - The URL should start with `postgresql://`
   - It should contain your password
   - It should end with `:5432/postgres`

## ⚡ Quick Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Selected correct project
- [ ] Clicked "Connect" button (top navigation)
- [ ] Selected "Direct connection"
- [ ] Copied complete connection string
- [ ] Connection string includes password
- [ ] Connection string has port 5432
- [ ] Ready to paste into Railway deployment script

## 🆘 Troubleshooting

### Can't Find Connect Button?
- It's in the **top navigation bar** (not sidebar)
- Look for a green/blue "Connect" button
- If missing, try refreshing the page

### Connection String Missing Password?
- Supabase might show `[YOUR-PASSWORD]` as placeholder
- Replace it with your actual database password
- The password you set when creating the project

### Not Sure Which Connection Type?
- For Railway: Use **Direct connection**
- For Vercel/Netlify: Use **Transaction pooler**
- For long-running connections: Use **Session pooler**

## 📞 Need More Help?

1. Check Supabase Status: [status.supabase.com](https://status.supabase.com)
2. Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
3. Railway Docs: [docs.railway.app](https://docs.railway.app)

---

**Note**: Supabase UI may change. If these instructions don't match, look for "Connect", "Connection", or "Database URL" in the dashboard.