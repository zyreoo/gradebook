#!/usr/bin/env node

/**
 * Master Test Runner
 * 
 * Runs all test suites:
 * - 2FA System
 * - Audit Log System
 * - Backup System
 * - Email Service
 * - Article 19 Compliance
 */

const { execFileSync } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    
    magenta: '\x1b[35m'
};

function log(color, symbol, message) {
    console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message) {
    log(colors.green, '✓', message);
}

function error(message) {
    log(colors.red, '✗', message);
}

function info(message) {
    log(colors.blue, 'ℹ', message);
}

function section(message) {
    console.log(`\n${colors.cyan}━━━ ${message} ━━━${colors.reset}`);
}

function runTest(testFile, testName) {
    return new Promise((resolve, reject) => {
        try {
            info(`Running ${testName}...`);
            const testPath = path.join(__dirname, testFile);
            const output = execFileSync('node', [testPath], {
                encoding: 'utf-8',
                stdio: 'pipe',
                cwd: __dirname
            });
            
            // Check if output contains success indicators
            const hasErrors = output.includes('✗') || output.includes('Test failed') || output.includes('Fatal error');
            const hasSuccess = output.includes('✓') || output.includes('successfully') || output.includes('PASSED');
            
            if (hasErrors && !hasSuccess) {
                console.log(output);
                reject(new Error(`${testName} failed`));
            } else {
                console.log(output);
                resolve({ success: true, name: testName });
            }
        } catch (err) {
            console.log(err.stdout || err.message);
            reject({ success: false, name: testName, error: err.message });
        }
    });
}

async function runAllTests() {
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('   COMPREHENSIVE TEST SUITE');
    console.log('   Testing All Systems');
    console.log('════════════════════════════════════════════════');
    console.log('');

    const tests = [
        { file: 'test-2fa.js', name: '2FA System' },
        { file: 'test-email.js', name: 'Email Service' },
        { file: 'test-audit-log.js', name: 'Audit Log System' },
        { file: 'test-backup.js', name: 'Backup System' },
        { file: 'test-article19.js', name: 'Article 19 Compliance' }
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        section(`Running: ${test.name}`);
        
        try {
            const result = await runTest(test.file, test.name);
            results.push(result);
            passed++;
            success(`${test.name}: PASSED`);
        } catch (err) {
            results.push({ success: false, name: test.name, error: err.message || err });
            failed++;
            error(`${test.name}: FAILED`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('════════════════════════════════════════════════');
    console.log('');

    results.forEach(result => {
        if (result.success) {
            success(`${result.name}: PASSED`);
        } else {
            error(`${result.name}: FAILED`);
            if (result.error) {
                info(`  Error: ${result.error}`);
            }
        }
    });

    console.log('');
    console.log('════════════════════════════════════════════════');
    
    if (failed === 0) {
        success(`ALL TESTS PASSED (${passed}/${tests.length})`);
        console.log('');
        info('All systems are working correctly!');
        console.log('');
        process.exit(0);
    } else {
        error(`SOME TESTS FAILED (${passed} passed, ${failed} failed)`);
        console.log('');
        info('Please review the failed tests above.');
        console.log('');
        process.exit(1);
    }
}

// Handle errors
process.on('unhandledRejection', (err) => {
    error(`Unhandled error: ${err.message}`);
    process.exit(1);
});

// Run all tests
runAllTests().catch(err => {
    error(`Fatal error: ${err.message}`);
    process.exit(1);
});
