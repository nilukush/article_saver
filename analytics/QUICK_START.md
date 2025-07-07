# 🚀 Quick Start - Analytics Dashboard in 30 Minutes

## What You're Building
A professional analytics dashboard that shows:
- How many users you have
- User growth over time
- Article reading patterns
- Which content is most popular
- User engagement metrics

## Prerequisites Checklist
- [ ] GitHub account (for Render deployment)
- [ ] Supabase project with Article Saver database
- [ ] 30 minutes of time

## 3-Step Process

### 1️⃣ Deploy Metabase (10 mins)
```bash
# From article_saver directory
git add analytics/render.yaml analytics/Dockerfile
git commit -m "Add Metabase deployment files"
git push
```

Then:
1. Go to render.com
2. New → Blueprint → Select your repo
3. Blueprint path: `analytics/render.yaml`
4. Deploy!

### 2️⃣ Connect Database (5 mins)
When Metabase opens:
1. Add your Supabase PostgreSQL details
2. Enable SSL (required!)
3. Test connection

### 3️⃣ Create Dashboard (15 mins)
Copy-paste the SQL queries from RENDER_DEPLOYMENT_GUIDE.md

## 🎯 By Tonight You'll Have
- Live dashboard URL to share
- Real-time user metrics
- Professional analytics like big startups
- Zero monthly cost

## 🆘 Stuck?
The most common issues:
1. **SSL not enabled** - Toggle it ON in database settings
2. **Wrong password** - Get it from Supabase Settings → Database
3. **Render spinning down** - Normal for free tier, just refresh

## 📊 Your First Metrics
After setup, you'll immediately see:
- Total users: 2
- Articles saved
- User activity patterns
- Growth trends

Perfect for tracking your journey from 2 to 200 users!