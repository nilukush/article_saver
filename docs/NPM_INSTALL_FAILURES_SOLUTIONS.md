# NPM Install Failures in GitHub Actions: Enterprise Solutions Guide

## Common Causes of NPM Install Failures After Configuration is Correct

### 1. Memory Exhaustion During Dependency Installation

**Symptoms:**
- Process killed silently during npm install
- "JavaScript heap out of memory" errors
- Installation hangs at certain dependencies

**Root Causes:**
- Default Node.js heap size (1.4GB) insufficient for large dependency trees
- Monorepo workspaces multiply memory requirements
- Concurrent package installations exceed available memory

**Enterprise Solutions:**
```yaml
# Increase Node.js heap size to 8GB
env:
  NODE_OPTIONS: --max-old-space-size=8192
  
# Add swap space for memory-intensive operations
- name: Setup swap space
  run: |
    sudo fallocate -l 8G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
```

### 2. Disk Space Issues

**Symptoms:**
- "ENOSPC: no space left on device" errors
- Installation succeeds partially then fails

**Root Causes:**
- GitHub Actions runners have limited disk space (~14GB free)
- npm cache and node_modules consume significant space
- Multiple workspace installations compound the issue

**Enterprise Solutions:**
```yaml
# Free up disk space before installation
- name: Free Disk Space (Ubuntu)
  uses: jlumbroso/free-disk-space@main
  with:
    android: true
    dotnet: true
    haskell: true
    large-packages: true
    docker-images: true
    swap-storage: true
```

### 3. Network Timeouts Despite Correct Configuration

**Symptoms:**
- Random failures at different packages
- "network timeout" errors
- "socket hang up" errors

**Root Causes:**
- GitHub Actions network throttling
- npm registry rate limiting
- Concurrent connections overwhelming the network

**Enterprise Solutions:**
```yaml
# Reduce concurrent network connections
npm config set maxsockets 5
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000

# Use UV_THREADPOOL_SIZE to limit concurrent operations
env:
  UV_THREADPOOL_SIZE: 1
```

### 4. Package Registry Issues

**Symptoms:**
- 503 Service Unavailable errors
- Registry timeout errors
- Checksum mismatches

**Root Causes:**
- npm registry outages or maintenance
- Corporate proxy/firewall issues
- Registry mirror synchronization problems

**Enterprise Solutions:**
```yaml
# Enable offline mode with fallback
npm config set prefer-offline true

# Cache node_modules between runs
- uses: actions/cache@v3
  with:
    path: |
      **/node_modules
      ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

### 5. Corrupted package-lock.json Files

**Symptoms:**
- "npm ERR! Invalid package-lock.json" errors
- Inconsistent dependency resolution
- Different results between local and CI

**Root Causes:**
- Mixed npm versions between developers
- Manual edits to package-lock.json
- Merge conflicts poorly resolved

**Enterprise Solutions:**
```yaml
# Regenerate package-lock if corrupted
- name: Validate and regenerate package-lock
  run: |
    npm install --package-lock-only --workspaces-update=false || {
      rm -f package-lock.json
      npm install --package-lock-only
    }
```

### 6. Node.js Version Compatibility Issues

**Symptoms:**
- Native module compilation failures
- "Unsupported engine" warnings
- Binary incompatibility errors

**Root Causes:**
- Mismatched Node.js versions between environments
- Dependencies requiring specific Node versions
- Native modules built for different architectures

**Enterprise Solutions:**
```yaml
# Use exact Node.js version with caching
- uses: actions/setup-node@v4
  with:
    node-version: '18.19.0'  # Exact LTS version
    cache: 'npm'
```

## Enterprise-Grade Solutions for NPM Workspace Installations

### 1. Two-Phase Installation Strategy

```yaml
# Method 1: Workspace-aware installation
- name: Install dependencies (Method 1)
  id: install_method1
  continue-on-error: true
  run: |
    npm ci --no-audit --no-fund --prefer-offline

# Method 2: Sequential installation fallback
- name: Install dependencies (Method 2)
  if: steps.install_method1.outcome == 'failure'
  run: |
    # Install root first
    npm install --no-workspaces --legacy-peer-deps
    
    # Install each workspace separately
    cd backend && npm install --legacy-peer-deps
    cd ../desktop && npm install --legacy-peer-deps
```

### 2. Resource Monitoring and Optimization

```yaml
# Monitor system resources throughout installation
- name: Pre-install cleanup
  run: |
    echo "System resources before install:"
    free -h
    df -h
    
    # Clean up to maximize available resources
    rm -rf node_modules */node_modules
    npm cache clean --force
```

### 3. Alternative Package Managers for Large Monorepos

**PNPM (Recommended for monorepos):**
- 3x faster than npm
- 60% less disk space usage
- Better monorepo support

```yaml
- name: Install pnpm
  run: npm install -g pnpm@8

- name: Install dependencies with pnpm
  run: pnpm install --frozen-lockfile
```

**Yarn Berry with PnP:**
- Zero-installs capability
- Significantly reduced disk usage
- Better workspace protocol support

### 4. CI-Specific Optimizations

```yaml
# Disable unnecessary features for CI
env:
  ELECTRON_SKIP_BINARY_DOWNLOAD: 1
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 1
  CYPRESS_INSTALL_BINARY: 0
  HUSKY: 0
  
# Use CI-specific commands
run: |
  npm ci  # Instead of npm install
  npm run build --if-present
```

### 5. Gradual Rollout Strategy

For critical projects, implement a staged approach:

1. **Canary Workflow**: Test new configurations on a subset of builds
2. **Matrix Strategy**: Test across multiple Node versions/OS combinations
3. **Fallback Mechanisms**: Always have a working fallback installation method

### 6. Monitoring and Alerting

```yaml
# Add installation metrics
- name: Report installation metrics
  if: always()
  run: |
    echo "Installation duration: ${{ steps.install.duration }}"
    echo "Peak memory usage: $(cat /proc/meminfo | grep MemAvailable)"
    echo "Final disk usage: $(df -h | grep /dev/root)"
```

## Best Practices Summary

1. **Always set NODE_OPTIONS** with increased heap size (minimum 4GB, preferably 8GB)
2. **Free disk space** on Ubuntu runners before installation
3. **Implement fallback strategies** for installation failures
4. **Cache aggressively** but verify cache integrity
5. **Monitor resource usage** to identify bottlenecks
6. **Consider alternative package managers** for large monorepos
7. **Use exact versions** for Node.js and npm to ensure consistency
8. **Limit concurrent operations** to prevent resource exhaustion

## Implementation Priority

1. **Immediate**: Increase NODE_OPTIONS to 8192MB
2. **High**: Add disk space cleanup for Ubuntu runners
3. **High**: Implement two-phase installation strategy
4. **Medium**: Add swap space for memory-intensive operations
5. **Medium**: Cache node_modules in addition to npm cache
6. **Low**: Consider migration to pnpm for better monorepo support

These solutions have been proven effective in enterprise environments handling large-scale npm workspace installations in CI/CD pipelines.