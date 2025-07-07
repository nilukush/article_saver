const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize enterprise metrics if available
let EnterpriseMetrics;
let metrics;
try {
  EnterpriseMetrics = require('./enterprise-metrics');
  metrics = new EnterpriseMetrics(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
} catch (err) {
  console.log('Enterprise metrics module not found, using basic metrics only');
}

// Cache metrics for 5 minutes to reduce database calls
let metricsCache = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getMetrics() {
  const now = Date.now();
  if (metricsCache && cacheTime && (now - cacheTime < CACHE_DURATION)) {
    return metricsCache;
  }

  try {
    // Fetch all metrics in parallel - use correct lowercase table names and snake_case columns
    const [users, articles, readArticles, recentActivity] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('articles').select('*', { count: 'exact', head: true }),
      supabase.from('articles').select('*', { count: 'exact', head: true }).eq('is_read', true),
      supabase.from('articles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(30)
    ]);

    // Log any errors for debugging
    if (users.error) console.error('Users query error:', users.error);
    if (articles.error) console.error('Articles query error:', articles.error);
    if (readArticles.error) console.error('Read articles query error:', readArticles.error);
    if (recentActivity.error) console.error('Recent activity query error:', recentActivity.error);

    // Calculate daily active users (last 7 days) - use snake_case column names
    const { data: activeUsers, error: activeUsersError } = await supabase
      .from('articles')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (activeUsersError) console.error('Active users query error:', activeUsersError);
    
    const uniqueActiveUsers = new Set(activeUsers?.map(a => a.user_id) || []).size;

    metricsCache = {
      totalUsers: users.count || 0,
      totalArticles: articles.count || 0,
      readArticles: readArticles.count || 0,
      readRate: articles.count ? ((readArticles.count / articles.count) * 100).toFixed(1) : 0,
      articlesPerUser: users.count ? (articles.count / users.count).toFixed(1) : 0,
      activeUsersWeek: uniqueActiveUsers,
      lastUpdated: new Date().toISOString()
    };
    cacheTime = now;
    
    return metricsCache;
  } catch (error) {
    console.error('Error fetching metrics:', error.message);
    console.error('Full error details:', error);
    return null;
  }
}

// Serve enterprise dashboard
app.get('/enterprise', (req, res) => {
  res.sendFile('enterprise-dashboard.html', { root: __dirname });
});

// Serve dashboard
app.get('/', async (req, res) => {
  const metrics = await getMetrics();
  
  if (!metrics) {
    return res.status(500).send('Error loading analytics. Please check configuration.');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Article Saver Analytics</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          margin-bottom: 30px;
          color: #2c3e50;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
          transition: transform 0.2s;
        }
        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .metric-value {
          font-size: 3em;
          font-weight: bold;
          color: #3498db;
          margin-bottom: 10px;
        }
        .metric-label {
          font-size: 1.1em;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .metric-card.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .metric-card.highlight .metric-value,
        .metric-card.highlight .metric-label {
          color: white;
        }
        .footer {
          text-align: center;
          margin-top: 50px;
          color: #7f8c8d;
          font-size: 0.9em;
        }
        .refresh-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          margin-top: 20px;
        }
        .refresh-btn:hover {
          background: #2980b9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Article Saver Analytics Dashboard</h1>
        
        <div class="metrics-grid">
          <div class="metric-card highlight">
            <div class="metric-value">${metrics.totalUsers}</div>
            <div class="metric-label">Total Users</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.totalArticles}</div>
            <div class="metric-label">Total Articles</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.readRate}%</div>
            <div class="metric-label">Read Rate</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.articlesPerUser}</div>
            <div class="metric-label">Articles per User</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.activeUsersWeek}</div>
            <div class="metric-label">Active Users (7d)</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${metrics.readArticles}</div>
            <div class="metric-label">Articles Read</div>
          </div>
        </div>
        
        <div class="footer">
          <p>Last updated: ${new Date(metrics.lastUpdated).toLocaleString()}</p>
          <button class="refresh-btn" onclick="window.location.reload()">Refresh Dashboard</button>
          <p style="margin-top: 20px;">
            <a href="/enterprise" style="color: #3498db; text-decoration: none; font-weight: bold;">
              🚀 View Enterprise Dashboard →
            </a>
          </p>
          <p style="margin-top: 10px;">Data cached for 5 minutes to optimize performance</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Enterprise metrics endpoint
app.get('/metrics/enterprise', async (req, res) => {
  if (!metrics) {
    return res.status(503).json({ 
      error: 'Enterprise metrics not available', 
      message: 'The enterprise metrics module is not loaded'
    });
  }
  
  try {
    const enterpriseMetrics = await metrics.getAllMetrics();
    res.json(enterpriseMetrics);
  } catch (error) {
    console.error('Error fetching enterprise metrics:', error);
    res.status(500).json({ error: 'Failed to fetch enterprise metrics' });
  }
});

// Debug endpoint - ONLY IN DEVELOPMENT
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug', async (req, res) => {
    try {
      const usersTest = await supabase.from('users').select('*', { count: 'exact', head: true });
      const articlesTest = await supabase.from('articles').select('*', { count: 'exact', head: true });
      
      res.json({
        success: true,
        users: { count: usersTest.count, error: usersTest.error },
        articles: { count: articlesTest.count, error: articlesTest.error }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

app.listen(port, () => {
  console.log(`Analytics dashboard running on port ${port}`);
  console.log('Environment check:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
});