#!/usr/bin/env node

/**
 * Simple HTTP server to serve the download dashboard locally
 * This bypasses CORS issues when accessing GitHub API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DASHBOARD_FILE = path.join(__dirname, '..', 'download-dashboard-fixed.html');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create server
const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Default to dashboard
    let filePath = req.url === '/' ? DASHBOARD_FILE : path.join(__dirname, '..', req.url);
    
    // Security: prevent directory traversal
    const safePath = path.normalize(filePath);
    const projectRoot = path.join(__dirname, '..');
    if (!safePath.startsWith(projectRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        // Get file extension
        const extname = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        
        // Read and serve file
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading file');
                return;
            }
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
        });
    });
});

// Start server
server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/`;
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Article Saver Download Dashboard Server               ║
╠════════════════════════════════════════════════════════╣
║  Dashboard available at: ${url}              ║
║                                                        ║
║  Press Ctrl+C to stop the server                      ║
╚════════════════════════════════════════════════════════╝
    `);
    
    // Try to open in default browser
    const { exec } = require('child_process');
    const openCommand = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    
    exec(`${openCommand} ${url}`, (err) => {
        if (err) {
            console.log('Please open your browser and navigate to:', url);
        }
    });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    server.close(() => {
        console.log('Server stopped.');
        process.exit(0);
    });
});