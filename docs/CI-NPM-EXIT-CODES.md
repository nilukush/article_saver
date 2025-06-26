# NPM Exit Codes in CI/CD Environments

## Overview

This document provides enterprise-grade guidance for handling npm exit codes in GitHub Actions and other CI/CD environments.

## Common NPM Exit Codes

### Exit Code 0 - Success
- **Meaning**: Installation completed successfully
- **Action**: Continue with build process

### Exit Code 1 - General Error/Warnings
- **Common Causes**:
  - npm audit warnings (security vulnerabilities)
  - Peer dependency warnings
  - Deprecated package warnings
  - Optional dependency failures
- **Detection Strategy**:
  ```bash
  # Check if node_modules exists despite exit code 1
  if [ $? -eq 1 ] && [ -d "node_modules" ]; then
    echo "Warnings detected but installation successful"
  fi
  ```
- **Recommendation**: Verify node_modules exists before treating as failure

### Exit Code 137 - SIGKILL (Out of Memory)
- **Meaning**: Process killed by OOM killer
- **Common Causes**:
  - Insufficient memory
  - Memory leak in npm process
  - Too many concurrent installs
- **Mitigation**:
  - Add swap space
  - Reduce Node.js heap size
  - Use sequential installation
  - Clear system caches between installs

### Exit Code 143 - SIGTERM
- **Meaning**: Process terminated gracefully
- **Common Causes**:
  - Timeout reached
  - Manual termination
  - System shutdown
- **Mitigation**:
  - Increase timeout limits
  - Reduce installation concurrency
  - Monitor memory usage

## Memory Management Strategies

### 1. Dynamic Memory Allocation
```bash
# Calculate 70% of available memory
available_mb=$(free -m | grep Mem | awk '{print int($7 * 0.7)}')
node_mem=$(( available_mb < 4096 ? available_mb : 4096 ))
export NODE_OPTIONS="--max-old-space-size=${node_mem}"
```

### 2. Memory Pressure Recovery
```bash
# Clear system caches when memory usage is high
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

### 3. Swap Space Configuration
```bash
# Add 8GB swap for GitHub Actions
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## GitHub Actions Specific Considerations

### 1. Runner Specifications
- **Ubuntu Latest**: 7GB RAM, 14GB SSD
- **Memory After OS**: ~6GB available
- **Recommended Swap**: 8-16GB

### 2. Orphan Process Cleanup
GitHub Actions automatically terminates orphan processes, which can appear as:
```
Terminate orphan process: pid (88879) (npm install)
```

This indicates parallel npm processes that weren't properly terminated.

### 3. Environment Variables
```yaml
env:
  NODE_OPTIONS: --max-old-space-size=6144  # 6GB for main process
  JOBS: 1                                   # Limit parallelism
  UV_THREADPOOL_SIZE: 1                     # Reduce thread pool
  ELECTRON_SKIP_BINARY_DOWNLOAD: 1          # Skip large downloads
```

## Enterprise Best Practices

### 1. Retry Logic Implementation
```bash
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
    npm install && break
    echo "Attempt $i failed, retrying..."
    sleep $((i * 5))
done
```

### 2. Exit Code Handling Matrix
| Exit Code | Severity | Auto-Retry | Action |
|-----------|----------|------------|--------|
| 0         | Success  | No         | Continue |
| 1         | Warning  | No         | Verify installation |
| 137       | Critical | Yes        | Add memory, retry |
| 143       | Critical | Yes        | Increase timeout, retry |
| Other     | Error    | Yes        | Log and retry |

### 3. Monitoring and Alerting
```bash
# Log memory usage during installation
while true; do
    echo "[$(date '+%H:%M:%S')] Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    sleep 30
done &
```

### 4. Validation Strategy
Always validate installation success:
```bash
# Check all expected node_modules directories
for dir in . backend desktop; do
    [ ! -d "$dir/node_modules" ] && echo "Missing: $dir/node_modules" && exit 1
done
```

## Troubleshooting Guide

### High Memory Usage (>80%)
1. Clear system caches
2. Reduce Node.js heap size
3. Use sequential installation
4. Add more swap space

### Persistent Exit Code 1
1. Check npm logs for specific warnings
2. Verify node_modules creation
3. Run with `--loglevel verbose`
4. Consider using `npm ci` instead

### Timeout Issues
1. Increase timeout to 45-60 minutes
2. Split installation into phases
3. Use npm cache effectively
4. Consider artifact caching

## Recommended Configuration

```yaml
# .github/workflows/build.yml
- name: Install dependencies
  timeout-minutes: 45
  env:
    NODE_OPTIONS: --max-old-space-size=6144
    JOBS: 1
  run: |
    # Use enterprise installation handler
    .github/scripts/npm-install-handler.sh
```

## Metrics to Track

1. **Installation Duration**: Track trends over time
2. **Memory Peak Usage**: Identify memory pressure points
3. **Exit Code Distribution**: Monitor failure patterns
4. **Retry Success Rate**: Measure retry effectiveness

## Security Considerations

1. Never ignore security audit failures in production
2. Use `npm audit fix` in separate PR
3. Document known vulnerabilities with justification
4. Regular dependency updates schedule

## References

- [Node.js Memory Management](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes)
- [NPM Exit Codes](https://docs.npmjs.com/cli/v8/using-npm/exit-codes)
- [GitHub Actions Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
- [Linux Exit Codes](https://tldp.org/LDP/abs/html/exitcodes.html)