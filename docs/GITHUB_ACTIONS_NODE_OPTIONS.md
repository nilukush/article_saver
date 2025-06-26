# GitHub Actions NODE_OPTIONS Configuration Guide

## Issue Summary

GitHub Actions has implemented security restrictions that prevent NODE_OPTIONS from being set via `$GITHUB_ENV` command. This change was introduced in actions/runner v2.309.0 and affects all workflows attempting to dynamically set NODE_OPTIONS.

## Error Messages

```
##[error]Can't store NODE_OPTIONS output parameter using '$GITHUB_ENV' command.
##[error]Process completed with exit code 1.
```

## Root Causes

1. **Security Restriction**: NODE_OPTIONS cannot be set using `echo "NODE_OPTIONS=value" >> $GITHUB_ENV`
2. **Deprecated npm config**: The `cache-min` option is deprecated in npm 10.x
3. **Exit code propagation**: When npm config fails, it prevents subsequent GITHUB_ENV commands

## Enterprise-Grade Solutions

### 1. Direct Environment Variable Setting

Instead of using GITHUB_ENV, set NODE_OPTIONS directly in the `env` section of each step:

```yaml
- name: Install dependencies
  env:
    NODE_OPTIONS: --max-old-space-size=6144
  run: |
    npm install
```

### 2. Remove Deprecated npm Configurations

Replace deprecated options with modern equivalents:

```yaml
# OLD (deprecated)
npm config set cache-min 3600

# NEW (recommended)
npm config set prefer-offline true
```

### 3. Proper Error Handling

Always use conditional execution to prevent cascading failures:

```yaml
- name: Setup npm configuration
  run: |
    npm config set audit false || true
    npm config set fund false || true
    # Remove deprecated options safely
    npm config delete cache-min || true
```

### 4. Workflow-Level Documentation

Add clear documentation in your workflow file:

```yaml
env:
  NODE_VERSION: '18.19.0'
  NPM_VERSION: '10.2.5'
  # Note: NODE_OPTIONS cannot be set here due to GitHub Actions security restrictions.
  # It must be set in the env section of individual steps that need it.
```

## Best Practices

### 1. Scope NODE_OPTIONS Narrowly

Only set NODE_OPTIONS for steps that actually need increased memory:

```yaml
# Good - scoped to build step
- name: Build application
  env:
    NODE_OPTIONS: --max-old-space-size=6144
  run: npm run build

# Avoid - global scope
env:
  NODE_OPTIONS: --max-old-space-size=6144  # This won't work anymore
```

### 2. Use Consistent Memory Limits

Standardize memory limits across your workflow:

```yaml
# Define as workflow variable for documentation
env:
  RECOMMENDED_NODE_MEMORY: '6144'  # 6GB

# Use in steps
- name: Build
  env:
    NODE_OPTIONS: --max-old-space-size=${{ env.RECOMMENDED_NODE_MEMORY }}
```

### 3. Monitor Memory Usage

Add memory diagnostics to troubleshoot issues:

```yaml
- name: Check system resources
  run: |
    echo "Memory info:"
    free -h || true
    echo "Node.js memory limit:"
    node -e "console.log('Max memory:', process.memoryUsage())"
```

### 4. Handle Platform Differences

Different runners may have different memory constraints:

```yaml
- name: Set platform-specific NODE_OPTIONS
  env:
    NODE_OPTIONS: ${{ runner.os == 'Linux' && '--max-old-space-size=6144' || '--max-old-space-size=4096' }}
  run: npm run build
```

## Alternative Approaches

### 1. Use setup-node Action

The setup-node action supports NODE_OPTIONS directly:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 18
  env:
    NODE_OPTIONS: --max-old-space-size=6144
```

### 2. Create Composite Actions

For complex workflows, create a composite action:

```yaml
# .github/actions/node-build/action.yml
name: 'Node Build with Memory'
runs:
  using: "composite"
  steps:
    - run: npm run build
      shell: bash
      env:
        NODE_OPTIONS: --max-old-space-size=6144
```

### 3. Use Repository Variables

For organization-wide consistency:

```yaml
- name: Build with org defaults
  env:
    NODE_OPTIONS: ${{ vars.ORG_NODE_OPTIONS || '--max-old-space-size=4096' }}
  run: npm run build
```

## Troubleshooting

### Issue: NODE_OPTIONS not taking effect

**Solution**: Verify the environment variable is set correctly:

```yaml
- name: Verify NODE_OPTIONS
  env:
    NODE_OPTIONS: --max-old-space-size=6144
  run: |
    echo "NODE_OPTIONS: $NODE_OPTIONS"
    node -e "console.log('Max heap:', v8.getHeapStatistics().heap_size_limit / 1024 / 1024, 'MB')"
```

### Issue: Different behavior between local and CI

**Solution**: Use explicit Node.js flags:

```yaml
- name: Run with explicit flags
  run: |
    node --max-old-space-size=6144 node_modules/.bin/webpack
```

### Issue: Memory limits still being exceeded

**Solution**: Consider build optimization:

```yaml
- name: Optimized build
  env:
    NODE_OPTIONS: --max-old-space-size=8192
  run: |
    # Clear caches
    rm -rf node_modules/.cache
    # Run build with reduced parallelism
    npm run build -- --max-workers=2
```

## Security Considerations

1. **Never expose sensitive data** through NODE_OPTIONS
2. **Avoid dynamic NODE_OPTIONS** from user input
3. **Use minimal required memory** to prevent resource exhaustion
4. **Document security implications** in your workflow

## Migration Checklist

- [ ] Remove all `echo "NODE_OPTIONS=..." >> $GITHUB_ENV` commands
- [ ] Add `env: NODE_OPTIONS:` to steps requiring memory limits
- [ ] Remove deprecated npm config options (`cache-min`)
- [ ] Add error handling with `|| true` for optional configs
- [ ] Test workflow with `act` locally if possible
- [ ] Document NODE_OPTIONS usage in workflow comments
- [ ] Monitor workflow performance after changes

## References

- [GitHub Actions NODE_OPTIONS Restriction Announcement](https://github.blog/changelog/2023-10-05-github-actions-node_options-is-now-restricted-from-github_env/)
- [actions/setup-node Documentation](https://github.com/actions/setup-node)
- [GitHub Actions Environment Variables](https://docs.github.com/en/actions/learn-github-actions/variables)
- [Node.js Command Line Options](https://nodejs.org/api/cli.html#cli_node_options_options)