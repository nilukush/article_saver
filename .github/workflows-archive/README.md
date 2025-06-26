# Archived Workflows

This directory contains archived GitHub Actions workflows that were replaced by the consolidated `main.yml` workflow.

## Why These Were Archived

Multiple workflows with the same triggers were causing:
- Redundant CI/CD runs
- Increased GitHub Actions usage and costs
- Confusion about which workflow was the authoritative one
- Maintenance overhead

## Archived Workflows

1. **build-and-deploy.yml** - Original CI/CD workflow
2. **build-and-deploy-optimized.yml** - Attempted optimization with duplicate triggers
3. **fix-lint-memory-exhaustion.yml** - Memory fix attempt #1
4. **fix-lint-memory-exhaustion-v2.yml** - Memory fix attempt #2
5. **memory-fix-simple.yml** - Simplified memory fix
6. **quick-fix-npm-install.yml** - NPM install debugging
7. **diagnostic-memory-test.yml** - Memory diagnostics workflow
8. **workflow-monitor.yml** - Workflow monitoring utility

## Consolidated Solution

All functionality has been consolidated into `.github/workflows/main.yml` which includes:
- Optimized memory allocation (8GB max-old-space-size)
- Swap space setup for additional memory
- Proper caching strategy
- Single source of truth for CI/CD
- Conditional deployment and release logic

## Restoring Workflows

If you need to reference or restore any of these workflows:
```bash
cp .github/workflows-archive/[workflow-name].yml .github/workflows/
```

However, ensure you don't have duplicate triggers active simultaneously.