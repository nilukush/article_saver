#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_USER = 'nilukush';
const GITHUB_REPO = 'article_saver';
const DATA_FILE = path.join(__dirname, '../download-data.json');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

// Fetch data from GitHub API
function fetchReleaseData() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`,
            headers: {
                'User-Agent': 'Article-Saver-Tracker',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const releases = JSON.parse(data);
                    resolve(releases);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Process release data
function processData(releases) {
    const stats = {
        totalDownloads: 0,
        platformBreakdown: {
            windows: 0,
            mac: 0,
            linux: 0
        },
        versionBreakdown: {},
        assetDetails: [],
        timestamp: new Date().toISOString()
    };

    releases.forEach(release => {
        const version = release.tag_name;
        stats.versionBreakdown[version] = 0;

        release.assets.forEach(asset => {
            const downloads = asset.download_count;
            stats.totalDownloads += downloads;
            stats.versionBreakdown[version] += downloads;

            // Platform detection
            if (asset.name.includes('.exe')) {
                stats.platformBreakdown.windows += downloads;
            } else if (asset.name.includes('.dmg')) {
                stats.platformBreakdown.mac += downloads;
            } else if (asset.name.includes('.AppImage') || asset.name.includes('.deb')) {
                stats.platformBreakdown.linux += downloads;
            }

            stats.assetDetails.push({
                name: asset.name,
                version: version,
                downloads: downloads,
                size: (asset.size / 1024 / 1024).toFixed(2) + ' MB',
                created: asset.created_at
            });
        });
    });

    return stats;
}

// Load historical data
function loadHistoricalData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
    return { history: [] };
}

// Save current data
function saveData(stats) {
    const historical = loadHistoricalData();
    
    // Add current snapshot
    historical.history.push({
        timestamp: stats.timestamp,
        totalDownloads: stats.totalDownloads,
        platformBreakdown: stats.platformBreakdown
    });

    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    historical.history = historical.history.filter(entry => 
        new Date(entry.timestamp) > thirtyDaysAgo
    );

    historical.current = stats;

    fs.writeFileSync(DATA_FILE, JSON.stringify(historical, null, 2));
}

// Calculate growth metrics
function calculateGrowth(historical, current) {
    if (!historical.history || historical.history.length === 0) {
        return { weekly: 0, daily: 0 };
    }

    // Find data from 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekOldData = historical.history
        .filter(entry => new Date(entry.timestamp) <= oneWeekAgo)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    // Find data from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayData = historical.history
        .filter(entry => new Date(entry.timestamp) <= yesterday)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    const growth = {
        weekly: 0,
        daily: 0
    };

    if (weekOldData) {
        growth.weekly = current.totalDownloads - weekOldData.totalDownloads;
    }

    if (yesterdayData) {
        growth.daily = current.totalDownloads - yesterdayData.totalDownloads;
    }

    return growth;
}

// Display results
function displayStats(stats, growth) {
    console.log('\n' + colors.bright + colors.cyan + '=== Article Saver Download Statistics ===' + colors.reset);
    console.log(colors.bright + 'Generated: ' + colors.reset + new Date().toLocaleString());
    
    console.log('\n' + colors.bright + colors.green + '📊 Total Downloads' + colors.reset);
    console.log('   ' + colors.bright + stats.totalDownloads.toLocaleString() + colors.reset + ' downloads');
    
    if (growth.weekly > 0) {
        console.log('   ' + colors.green + '+' + growth.weekly + colors.reset + ' this week');
    }
    if (growth.daily > 0) {
        console.log('   ' + colors.green + '+' + growth.daily + colors.reset + ' today');
    }

    console.log('\n' + colors.bright + colors.blue + '💻 Platform Distribution' + colors.reset);
    const platforms = [
        { name: 'Windows', icon: '🪟', count: stats.platformBreakdown.windows },
        { name: 'macOS', icon: '🍎', count: stats.platformBreakdown.mac },
        { name: 'Linux', icon: '🐧', count: stats.platformBreakdown.linux }
    ];

    platforms.forEach(platform => {
        const percentage = ((platform.count / stats.totalDownloads) * 100).toFixed(1);
        console.log(`   ${platform.icon}  ${platform.name}: ${platform.count} (${percentage}%)`);
    });

    console.log('\n' + colors.bright + colors.yellow + '📦 Version Breakdown' + colors.reset);
    Object.entries(stats.versionBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([version, count]) => {
            console.log(`   ${version}: ${count} downloads`);
        });

    console.log('\n' + colors.bright + colors.cyan + '📈 Top Downloads' + colors.reset);
    stats.assetDetails
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 5)
        .forEach(asset => {
            console.log(`   ${asset.name}: ${asset.downloads} downloads`);
        });

    console.log('\n' + colors.bright + '💡 Quick Links' + colors.reset);
    console.log('   Dashboard: file://' + path.join(__dirname, '../download-dashboard.html'));
    console.log('   GitHub Stats: https://tooomm.github.io/github-release-stats/?username=' + GITHUB_USER + '&repository=' + GITHUB_REPO);
    console.log('   Releases: https://github.com/' + GITHUB_USER + '/' + GITHUB_REPO + '/releases\n');
}

// Generate weekly report
function generateWeeklyReport(stats, historical) {
    const reportPath = path.join(__dirname, '../weekly-report.md');
    const growth = calculateGrowth(historical, stats);
    
    const report = `# Article Saver Weekly Download Report

Generated: ${new Date().toLocaleString()}

## Summary
- **Total Downloads:** ${stats.totalDownloads.toLocaleString()}
- **Weekly Growth:** +${growth.weekly} downloads
- **Daily Average:** ${Math.round(growth.weekly / 7)} downloads/day

## Platform Distribution
- Windows: ${stats.platformBreakdown.windows} (${((stats.platformBreakdown.windows / stats.totalDownloads) * 100).toFixed(1)}%)
- macOS: ${stats.platformBreakdown.mac} (${((stats.platformBreakdown.mac / stats.totalDownloads) * 100).toFixed(1)}%)
- Linux: ${stats.platformBreakdown.linux} (${((stats.platformBreakdown.linux / stats.totalDownloads) * 100).toFixed(1)}%)

## Version Performance
${Object.entries(stats.versionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([version, count]) => `- ${version}: ${count} downloads`)
    .join('\n')}

## Recommendations
${growth.weekly > 50 ? '✅ Strong growth this week! Consider announcing new features.' : ''}
${growth.weekly < 10 ? '⚠️ Growth is slow. Consider marketing push or new release.' : ''}
${stats.platformBreakdown.windows > stats.totalDownloads * 0.6 ? '💡 Windows dominates. Ensure Windows experience is optimal.' : ''}
${stats.platformBreakdown.linux < stats.totalDownloads * 0.1 ? '💡 Linux adoption is low. Consider Linux-focused marketing.' : ''}
`;

    fs.writeFileSync(reportPath, report);
    console.log(colors.green + '✅ Weekly report saved to: ' + colors.reset + reportPath);
}

// Main execution
async function main() {
    try {
        console.log(colors.cyan + '🔄 Fetching download data from GitHub...' + colors.reset);
        
        const releases = await fetchReleaseData();
        const stats = processData(releases);
        const historical = loadHistoricalData();
        const growth = calculateGrowth(historical, stats);
        
        saveData(stats);
        displayStats(stats, growth);
        
        // Generate weekly report on Sundays
        const today = new Date().getDay();
        if (today === 0 || process.argv.includes('--report')) {
            generateWeeklyReport(stats, historical);
        }
        
    } catch (error) {
        console.error(colors.red + '❌ Error: ' + colors.reset + error.message);
        process.exit(1);
    }
}

// Command line options
if (process.argv.includes('--help')) {
    console.log(`
${colors.bright}Article Saver Download Tracker${colors.reset}

Usage: node download-tracker.js [options]

Options:
  --help     Show this help message
  --report   Generate weekly report (automatic on Sundays)
  --json     Output raw JSON data

Examples:
  node download-tracker.js              # Show download statistics
  node download-tracker.js --report     # Generate weekly report
  
Dashboard: Open download-dashboard.html in your browser for interactive view
`);
    process.exit(0);
}

if (process.argv.includes('--json')) {
    fetchReleaseData()
        .then(releases => {
            const stats = processData(releases);
            console.log(JSON.stringify(stats, null, 2));
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
} else {
    main();
}