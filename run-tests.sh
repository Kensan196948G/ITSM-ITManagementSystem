#!/bin/bash
# ITSM Test Execution Script
# Comprehensive test runner with reporting

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/tests/reports"
LOG_FILE="$REPORTS_DIR/test-execution.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

setup_environment() {
    log_info "Setting up test environment..."
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$REPORTS_DIR/screenshots"
    mkdir -p "$REPORTS_DIR/videos"
    mkdir -p "$REPORTS_DIR/charts"
    
    # Create log file
    echo "ITSM Test Execution Log - $(date)" > "$LOG_FILE"
    
    # Load environment variables
    if [ -f "$SCRIPT_DIR/.env.test" ]; then
        export $(cat "$SCRIPT_DIR/.env.test" | grep -v '^#' | xargs)
        log_info "Loaded test environment variables"
    fi
    
    # Check Python installation
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check if in virtual environment (recommended)
    if [[ "$VIRTUAL_ENV" == "" ]]; then
        log_warning "Not in a virtual environment. Consider using 'python -m venv venv && source venv/bin/activate'"
    fi
    
    log_success "Environment setup completed"
}

install_dependencies() {
    log_info "Installing test dependencies..."
    
    pip install --upgrade pip
    pip install -r requirements-test.txt
    
    # Install Playwright browsers if E2E tests are requested
    if [[ "$*" == *"e2e"* ]] || [[ "$*" == *"all"* ]]; then
        log_info "Installing Playwright browsers..."
        playwright install chromium
        playwright install-deps chromium
    fi
    
    log_success "Dependencies installed"
}

run_unit_tests() {
    log_info "Running unit tests..."
    
    python3 -m pytest tests/ \
        -v \
        --tb=short \
        --html="$REPORTS_DIR/unit-report.html" \
        --self-contained-html \
        --json-report \
        --json-report-file="$REPORTS_DIR/unit-report.json" \
        --cov=src \
        --cov-report=html:"$REPORTS_DIR/unit-coverage-html" \
        --cov-report=json:"$REPORTS_DIR/unit-coverage.json" \
        --cov-report=term-missing \
        -m "unit" \
        || { log_error "Unit tests failed"; return 1; }
    
    log_success "Unit tests completed"
}

run_api_tests() {
    log_info "Running API tests..."
    
    python3 -m pytest tests/api/ \
        -v \
        --tb=short \
        --html="$REPORTS_DIR/api-report.html" \
        --self-contained-html \
        --json-report \
        --json-report-file="$REPORTS_DIR/api-report.json" \
        --cov=src \
        --cov-report=html:"$REPORTS_DIR/api-coverage-html" \
        --cov-report=json:"$REPORTS_DIR/api-coverage.json" \
        --cov-report=term-missing \
        --benchmark-json="$REPORTS_DIR/api-benchmark.json" \
        -m "api and not slow" \
        || { log_error "API tests failed"; return 1; }
    
    log_success "API tests completed"
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Set E2E specific environment variables
    export HEADLESS=${HEADLESS:-true}
    export RECORD_VIDEO=${RECORD_VIDEO:-false}
    
    python3 -m pytest tests/e2e/ \
        -v \
        --tb=short \
        --html="$REPORTS_DIR/e2e-report.html" \
        --self-contained-html \
        --json-report \
        --json-report-file="$REPORTS_DIR/e2e-report.json" \
        -m "e2e and not slow" \
        --maxfail=5 \
        || { log_error "E2E tests failed"; return 1; }
    
    log_success "E2E tests completed"
}

run_load_tests() {
    log_info "Running load tests..."
    
    # Set load test specific environment variables
    export BENCHMARK_ROUNDS=${BENCHMARK_ROUNDS:-3}
    export BENCHMARK_TIMEOUT=${BENCHMARK_TIMEOUT:-300}
    
    python3 -m pytest tests/load/ \
        -v \
        --tb=short \
        --html="$REPORTS_DIR/load-report.html" \
        --self-contained-html \
        --json-report \
        --json-report-file="$REPORTS_DIR/load-report.json" \
        --benchmark-json="$REPORTS_DIR/load-benchmark.json" \
        -m "load" \
        --benchmark-sort=mean \
        || { log_error "Load tests failed"; return 1; }
    
    log_success "Load tests completed"
}

run_security_tests() {
    log_info "Running security tests..."
    
    # Install security tools if not present
    pip install bandit safety || true
    
    # Run Bandit security scan
    log_info "Running Bandit security scan..."
    bandit -r src/ -f json -o "$REPORTS_DIR/bandit-report.json" || true
    bandit -r src/ -f txt | tee -a "$LOG_FILE"
    
    # Check dependencies for vulnerabilities
    log_info "Checking dependencies for vulnerabilities..."
    safety check --json --output "$REPORTS_DIR/safety-report.json" || true
    safety check | tee -a "$LOG_FILE"
    
    log_success "Security tests completed"
}

generate_reports() {
    log_info "Generating consolidated reports..."
    
    # Use Python report generator
    python3 tests/utils/generate_consolidated_report.py \
        --input-dir "$REPORTS_DIR" \
        --output-dir "$REPORTS_DIR/consolidated"
    
    log_success "Reports generated in $REPORTS_DIR/consolidated/"
    log_info "View HTML report: file://$REPORTS_DIR/consolidated/report.html"
    log_info "View Markdown report: $REPORTS_DIR/consolidated/report.md"
}

check_quality_gates() {
    log_info "Checking quality gates..."
    
    # Use Python test runner for quality gate checks
    if python3 tests/utils/test_runner.py --quality-gates-only --output "$REPORTS_DIR/consolidated/summary.json"; then
        log_success "All quality gates passed!"
        return 0
    else
        log_error "Quality gate violations detected!"
        return 1
    fi
}

show_summary() {
    log_info "Test execution summary:"
    
    if [ -f "$REPORTS_DIR/consolidated/summary.json" ]; then
        python3 -c "
import json
with open('$REPORTS_DIR/consolidated/summary.json', 'r') as f:
    data = json.load(f)
    
print('=' * 60)
print('🧪 ITSM TEST EXECUTION SUMMARY')
print('=' * 60)
print(f'Overall Status: {data[\"overall\"][\"status\"].upper()}')
print(f'Total Tests: {data[\"overall\"][\"total_tests\"]}')
print(f'Success Rate: {data[\"overall\"][\"success_rate\"]:.1f}%')
print(f'Duration: {data[\"overall\"][\"duration\"]:.2f}s')
print()
print('Suite Results:')
for suite in ['unit', 'api', 'e2e', 'load']:
    if suite in data and data[suite]:
        suite_data = data[suite]
        status = '✅' if suite_data.get('failed', 0) == 0 else '❌'
        print(f'  {status} {suite.upper()}: {suite_data.get(\"total\", 0)} tests, {suite_data.get(\"success_rate\", 0):.1f}% success')
print('=' * 60)
"
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove any temporary files if needed
    # (Implementation depends on what temporary files are created)
    
    log_info "Cleanup completed"
}

show_help() {
    echo "ITSM Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_SUITE]"
    echo ""
    echo "Test Suites:"
    echo "  unit      Run unit tests only"
    echo "  api       Run API tests only"
    echo "  e2e       Run E2E tests only"
    echo "  load      Run load tests only"
    echo "  security  Run security tests only"
    echo "  all       Run all test suites (default)"
    echo ""
    echo "Options:"
    echo "  --install-deps    Install dependencies before running tests"
    echo "  --skip-reports    Skip report generation"
    echo "  --skip-quality    Skip quality gate checks"
    echo "  --parallel        Run compatible tests in parallel"
    echo "  --verbose         Enable verbose output"
    echo "  --help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  HEADLESS=true|false           Run E2E tests in headless mode"
    echo "  RECORD_VIDEO=true|false       Record videos for E2E tests"
    echo "  BENCHMARK_ROUNDS=N            Number of benchmark rounds"
    echo "  BENCHMARK_TIMEOUT=N           Benchmark timeout in seconds"
    echo ""
    echo "Examples:"
    echo "  $0 api                        Run only API tests"
    echo "  $0 --install-deps all         Install deps and run all tests"
    echo "  $0 --parallel api unit        Run API and unit tests in parallel"
    echo ""
}

# Main execution
main() {
    local test_suite="all"
    local install_deps=false
    local skip_reports=false
    local skip_quality=false
    local parallel=false
    local verbose=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --install-deps)
                install_deps=true
                shift
                ;;
            --skip-reports)
                skip_reports=true
                shift
                ;;
            --skip-quality)
                skip_quality=true
                shift
                ;;
            --parallel)
                parallel=true
                shift
                ;;
            --verbose)
                verbose=true
                set -x
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            unit|api|e2e|load|security|all)
                test_suite="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Setup
    setup_environment
    
    if [ "$install_deps" = true ]; then
        install_dependencies
    fi
    
    # Run tests based on suite selection
    local exit_code=0
    local start_time=$(date +%s)
    
    log_info "Starting test execution: $test_suite"
    
    case $test_suite in
        unit)
            run_unit_tests || exit_code=1
            ;;
        api)
            run_api_tests || exit_code=1
            ;;
        e2e)
            run_e2e_tests || exit_code=1
            ;;
        load)
            run_load_tests || exit_code=1
            ;;
        security)
            run_security_tests || exit_code=1
            ;;
        all)
            if [ "$parallel" = true ]; then
                # Run unit and API tests in parallel
                log_info "Running unit and API tests in parallel..."
                (run_unit_tests) & 
                (run_api_tests) &
                wait
                
                # Then run E2E tests (must be sequential)
                run_e2e_tests || exit_code=1
                
                # Finally run load and security tests
                (run_load_tests) &
                (run_security_tests) &
                wait
            else
                # Sequential execution
                run_unit_tests || exit_code=1
                run_api_tests || exit_code=1
                run_e2e_tests || exit_code=1
                run_load_tests || exit_code=1
                run_security_tests || exit_code=1
            fi
            ;;
        *)
            log_error "Invalid test suite: $test_suite"
            show_help
            exit 1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate reports
    if [ "$skip_reports" = false ]; then
        generate_reports
    fi
    
    # Check quality gates
    if [ "$skip_quality" = false ] && [ $exit_code -eq 0 ]; then
        check_quality_gates || exit_code=1
    fi
    
    # Show summary
    show_summary
    
    log_info "Test execution completed in ${duration}s"
    
    if [ $exit_code -eq 0 ]; then
        log_success "All tests passed! ✅"
    else
        log_error "Some tests failed! ❌"
    fi
    
    # Cleanup
    cleanup
    
    exit $exit_code
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

# Run main function with all arguments
main "$@"