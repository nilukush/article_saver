// Enterprise-grade metrics calculations for Article Saver
const { createClient } = require('@supabase/supabase-js');

class EnterpriseMetrics {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // User Growth Metrics
  async getUserGrowthMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: currentMonth } = await this.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    const { data: previousMonth } = await this.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .lt('created_at', thirtyDaysAgo.toISOString())
      .gte('created_at', new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const growthRate = previousMonth?.count ? 
      ((currentMonth?.count - previousMonth?.count) / previousMonth?.count * 100).toFixed(1) : 0;
    
    return {
      newUsersLast30Days: currentMonth?.count || 0,
      growthRateMoM: growthRate + '%'
    };
  }

  // Engagement Metrics
  async getEngagementMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Daily Active Users
    const { data: dau } = await this.supabase
      .from('articles')
      .select('user_id')
      .gte('created_at', oneDayAgo.toISOString());
    
    // Weekly Active Users
    const { data: wau } = await this.supabase
      .from('articles')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    // Monthly Active Users
    const { data: mau } = await this.supabase
      .from('articles')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    const dauCount = new Set(dau?.map(a => a.user_id) || []).size;
    const wauCount = new Set(wau?.map(a => a.user_id) || []).size;
    const mauCount = new Set(mau?.map(a => a.user_id) || []).size;
    
    return {
      dailyActiveUsers: dauCount,
      weeklyActiveUsers: wauCount,
      monthlyActiveUsers: mauCount,
      dauMauRatio: mauCount ? (dauCount / mauCount * 100).toFixed(1) + '%' : '0%',
      stickiness: mauCount ? (dauCount / mauCount).toFixed(3) : '0'
    };
  }

  // Retention Cohorts
  async getRetentionCohorts() {
    const cohorts = {};
    const periods = [1, 7, 30, 90];
    
    for (const days of periods) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      
      // Get users who signed up X days ago
      const { data: cohortUsers } = await this.supabase
        .from('users')
        .select('id')
        .gte('created_at', new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', targetDate.toISOString());
      
      if (cohortUsers && cohortUsers.length > 0) {
        const userIds = cohortUsers.map(u => u.id);
        
        // Check if they were active today
        const { data: activeUsers } = await this.supabase
          .from('articles')
          .select('user_id')
          .in('user_id', userIds)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        const activeCount = new Set(activeUsers?.map(a => a.user_id) || []).size;
        cohorts[`day${days}`] = cohortUsers.length ? 
          (activeCount / cohortUsers.length * 100).toFixed(1) + '%' : '0%';
      } else {
        cohorts[`day${days}`] = 'N/A';
      }
    }
    
    return cohorts;
  }

  // Product Health Metrics
  async getProductHealthMetrics() {
    // User activation (users who saved at least 5 articles)
    const { data: allUsers } = await this.supabase
      .from('users')
      .select('id');
    
    const { data: activatedUsers } = await this.supabase
      .from('articles')
      .select('user_id')
      .select('user_id, count');
    
    // Group by user and count articles
    const userArticleCounts = {};
    activatedUsers?.forEach(a => {
      userArticleCounts[a.user_id] = (userArticleCounts[a.user_id] || 0) + 1;
    });
    
    const activatedCount = Object.values(userArticleCounts).filter(count => count >= 5).length;
    const activationRate = allUsers?.length ? 
      (activatedCount / allUsers.length * 100).toFixed(1) : 0;
    
    // Average articles per active user
    const totalArticles = Object.values(userArticleCounts).reduce((sum, count) => sum + count, 0);
    const activeUserCount = Object.keys(userArticleCounts).length;
    const avgArticlesPerUser = activeUserCount ? 
      (totalArticles / activeUserCount).toFixed(1) : 0;
    
    return {
      userActivationRate: activationRate + '%',
      activatedUsers: activatedCount,
      avgArticlesPerActiveUser: avgArticlesPerUser,
      totalActiveUsers: activeUserCount
    };
  }

  // Feature Adoption
  async getFeatureAdoption() {
    const { count: totalUsers } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Users who have read articles
    const { data: readers } = await this.supabase
      .from('articles')
      .select('user_id')
      .eq('is_read', true);
    
    // Users who have used tags
    const { data: tagUsers } = await this.supabase
      .from('articles')
      .select('user_id')
      .not('tags', 'eq', '{}');
    
    // Users who have archived articles
    const { data: archivers } = await this.supabase
      .from('articles')
      .select('user_id')
      .eq('is_archived', true);
    
    const readerCount = new Set(readers?.map(r => r.user_id) || []).size;
    const tagUserCount = new Set(tagUsers?.map(t => t.user_id) || []).size;
    const archiverCount = new Set(archivers?.map(a => a.user_id) || []).size;
    
    return {
      readingFeature: totalUsers ? (readerCount / totalUsers * 100).toFixed(1) + '%' : '0%',
      taggingFeature: totalUsers ? (tagUserCount / totalUsers * 100).toFixed(1) + '%' : '0%',
      archiveFeature: totalUsers ? (archiverCount / totalUsers * 100).toFixed(1) + '%' : '0%'
    };
  }

  // Get all enterprise metrics
  async getAllMetrics() {
    const [growth, engagement, retention, health, features] = await Promise.all([
      this.getUserGrowthMetrics(),
      this.getEngagementMetrics(),
      this.getRetentionCohorts(),
      this.getProductHealthMetrics(),
      this.getFeatureAdoption()
    ]);
    
    return {
      growth,
      engagement,
      retention,
      health,
      features,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = EnterpriseMetrics;