# Article Saver Analytics

This directory contains the analytics dashboard for Article Saver.

## Features

- Real-time user and article metrics
- Enterprise-grade analytics with growth, engagement, and retention metrics
- Beautiful visual dashboard with charts and KPIs
- Mobile responsive design

## Setup

1. Install dependencies:
   ```bash
   cd analytics
   npm install
   ```

2. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. Run locally:
   ```bash
   npm start
   ```

## Deployment

The analytics dashboard can be deployed to any platform that supports Node.js applications.

### Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `PORT`: Server port (default: 3000)

## Endpoints

- `/` - Basic metrics dashboard
- `/enterprise` - Enterprise analytics dashboard with detailed visualizations
- `/metrics/enterprise` - JSON API for enterprise metrics
- `/health` - Health check endpoint

## Technology Stack

- Node.js + Express
- Supabase for data
- Chart.js for visualizations
- Vanilla JavaScript (no framework dependencies)
