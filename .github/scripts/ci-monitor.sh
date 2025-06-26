#!/bin/bash
# CI/CD Performance Monitoring Script
# Analyzes GitHub Actions runs for npm install performance

set -euo pipefail

# Configuration
REPO="${GITHUB_REPOSITORY:-nilukush/article_saver}"
WORKFLOW_FILE="build-and-deploy.yml"
LIMIT="${1:-20}"  # Number of runs to analyze

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Actions NPM Install Performance Analysis ===${NC}"
echo "Repository: $REPO"
echo "Analyzing last $LIMIT workflow runs..."
echo

# Get workflow runs
runs=$(gh run list --workflow="$WORKFLOW_FILE" --limit="$LIMIT" --json databaseId,displayTitle,status,conclusion,startedAt,createdAt 2>/dev/null)

if [ -z "$runs" ]; then
    echo -e "${RED}No workflow runs found${NC}"
    exit 1
fi

# Initialize statistics
total_runs=0
successful_runs=0
failed_runs=0
exit_code_1_count=0
exit_code_137_count=0
exit_code_143_count=0
total_duration=0
max_duration=0
min_duration=999999

# Analyze each run
echo "$runs" | jq -r '.[] | @base64' | while read -r run_data; do
    _jq() {
        echo "$run_data" | base64 --decode | jq -r "$1"
    }
    
    run_id=$(_jq '.databaseId')
    title=$(_jq '.displayTitle')
    conclusion=$(_jq '.conclusion')
    started=$(_jq '.startedAt')
    created=$(_jq '.createdAt')
    
    total_runs=$((total_runs + 1))
    
    echo -ne "\rAnalyzing run $total_runs: $run_id"
    
    # Get install step details
    install_log=$(gh run view "$run_id" --log 2>/dev/null | grep -A 100 "Install dependencies" || true)
    
    if [ -n "$install_log" ]; then
        # Extract duration (if available)
        duration=$(echo "$install_log" | grep -oP "Install dependencies.*in \K\d+m \d+s" | head -1 || echo "")
        
        # Extract exit codes
        if echo "$install_log" | grep -q "exit code 1"; then
            exit_code_1_count=$((exit_code_1_count + 1))
        fi
        if echo "$install_log" | grep -q "exit code 137"; then
            exit_code_137_count=$((exit_code_137_count + 1))
        fi
        if echo "$install_log" | grep -q "exit code 143"; then
            exit_code_143_count=$((exit_code_143_count + 1))
        fi
        
        # Extract memory usage
        memory_info=$(echo "$install_log" | grep -E "Mem:.*Gi" | tail -1 || echo "")
    fi
    
    if [ "$conclusion" = "success" ]; then
        successful_runs=$((successful_runs + 1))
    else
        failed_runs=$((failed_runs + 1))
    fi
done

echo -e "\n\n${BLUE}=== Summary Report ===${NC}"
echo

# Success rate
success_rate=$(awk "BEGIN {printf \"%.1f\", ($successful_runs/$total_runs)*100}")
echo -e "Total Runs: $total_runs"
echo -e "Success Rate: ${GREEN}$success_rate%${NC} ($successful_runs successful, $failed_runs failed)"
echo

# Exit code analysis
echo -e "${YELLOW}Exit Code Distribution:${NC}"
echo "  Exit Code 0 (Success): $((successful_runs - exit_code_1_count))"
echo "  Exit Code 1 (Warnings): $exit_code_1_count"
echo "  Exit Code 137 (OOM Kill): $exit_code_137_count"
echo "  Exit Code 143 (SIGTERM): $exit_code_143_count"
echo

# Memory usage trends
echo -e "${YELLOW}Recent Memory Usage Patterns:${NC}"
recent_runs=$(gh run list --workflow="$WORKFLOW_FILE" --limit=5 --json databaseId --jq '.[].databaseId')
for run_id in $recent_runs; do
    memory=$(gh run view "$run_id" --log 2>/dev/null | grep -E "Final memory info" -A 2 | grep "Mem:" | tail -1 || echo "")
    if [ -n "$memory" ]; then
        echo "  Run $run_id: $memory"
    fi
done
echo

# Recommendations
echo -e "${BLUE}=== Recommendations ===${NC}"

if [ "$exit_code_143_count" -gt 0 ]; then
    echo -e "${RED}• High occurrence of SIGTERM (143) - Consider:${NC}"
    echo "  - Increasing timeout limits"
    echo "  - Adding more swap space"
    echo "  - Reducing parallel operations"
fi

if [ "$exit_code_137_count" -gt 0 ]; then
    echo -e "${RED}• OOM kills detected (137) - Consider:${NC}"
    echo "  - Reducing NODE_OPTIONS memory allocation"
    echo "  - Implementing sequential installation"
    echo "  - Clearing caches between workspace installs"
fi

if [ "$exit_code_1_count" -gt "$((total_runs / 2))" ]; then
    echo -e "${YELLOW}• Frequent npm warnings (exit code 1) - Consider:${NC}"
    echo "  - Running npm audit fix"
    echo "  - Updating dependencies"
    echo "  - Reviewing peer dependency conflicts"
fi

# Performance metrics
echo -e "\n${BLUE}=== Performance Optimization Suggestions ===${NC}"
echo "1. Enable npm caching with actions/cache"
echo "2. Use npm ci instead of npm install for faster installs"
echo "3. Consider using pnpm for better performance"
echo "4. Split large dependencies into separate install phases"
echo "5. Monitor and optimize package-lock.json size"

# Generate report file
report_file="ci-performance-report-$(date +%Y%m%d-%H%M%S).json"
echo "$runs" | jq --arg success_rate "$success_rate" \
    --arg exit_1 "$exit_code_1_count" \
    --arg exit_137 "$exit_code_137_count" \
    --arg exit_143 "$exit_code_143_count" \
    '{
        timestamp: now | strftime("%Y-%m-%d %H:%M:%S"),
        repository: "'$REPO'",
        total_runs: length,
        success_rate: $success_rate,
        exit_codes: {
            warnings: $exit_1 | tonumber,
            oom_kills: $exit_137 | tonumber,
            sigterm: $exit_143 | tonumber
        },
        runs: .
    }' > "$report_file"

echo -e "\n${GREEN}Report saved to: $report_file${NC}"