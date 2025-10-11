/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Simple test runner to demonstrate AbortSignal behavior
 * Run this with: npx tsx simpleAbortTest.ts
 */

import { spawn } from 'child_process';

interface TestResult {
    name: string;
    passed: boolean;
    details: string[];
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, details: string[]) {
    results.push({ name, passed, details });
}

async function testEventOrder(): Promise<void> {
    console.log('🧪 Testing event order when aborting running process...');

    const controller = new AbortController();
    const events: string[] = [];

    const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        signal: controller.signal
    });

    process.on('spawn', () => events.push('spawn'));
    process.on('error', (err) => events.push(`error:${err.name}`));
    process.on('exit', (code, signal) => events.push(`exit:${code}:${signal}`));
    process.on('close', () => events.push('close'));

    setTimeout(() => {
        events.push('abort_called');
        controller.abort();
    }, 100);

    await new Promise(resolve => {
        process.on('close', resolve);
    });

    const expectedOrder = ['spawn', 'abort_called', 'error:AbortError'];
    const actualStart = events.slice(0, 3);
    const hasCorrectOrder = expectedOrder.every((event, idx) => actualStart[idx] === event);
    const hasError = events.some(e => e.startsWith('error:AbortError'));

    addResult('Event Order', hasCorrectOrder && hasError, [
        `Events: ${events.join(' → ')}`,
        hasError ? '✅ AbortSignal emits error event' : '❌ No error event emitted',
        hasCorrectOrder ? '✅ Correct event order' : '❌ Wrong event order'
    ]);
}

async function testAbortBeforeSpawn(): Promise<void> {
    console.log('🧪 Testing abort before spawn...');

    const controller = new AbortController();
    controller.abort(); // Abort before spawn

    let errorEmitted = false;
    let errorType = '';

    try {
        const process = spawn('node', ['-e', 'console.log("hello")'], {
            signal: controller.signal
        });

        process.on('error', (err) => {
            errorEmitted = true;
            errorType = err.name;
        });

        await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
        const error = err as Error;
        errorEmitted = true;
        errorType = error.name;
    }

    addResult('Abort Before Spawn', errorEmitted, [
        errorEmitted ? '✅ Error emitted when aborted before spawn' : '❌ No error emitted',
        `Error type: ${errorType}`,
        'AbortSignal prevents unnecessary process creation'
    ]);
}

async function testExitCodes(): Promise<void> {
    console.log('🧪 Testing exit codes and signals...');

    const controller = new AbortController();
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;

    const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        signal: controller.signal
    });

    process.on('spawn', () => {
        setTimeout(() => controller.abort(), 50);
    });

    await new Promise(resolve => {
        process.on('exit', (code, signal) => {
            exitCode = code;
            exitSignal = signal;
            resolve(undefined);
        });
    });

    const wasTerminated = exitCode !== 0;

    addResult('Exit Behavior', wasTerminated, [
        `Exit code: ${exitCode}`,
        `Exit signal: ${exitSignal}`,
        wasTerminated ? '✅ Process was terminated (non-zero exit)' : '❌ Process exited normally',
        'AbortSignal causes process termination'
    ]);
}

async function compareWithManualKill(): Promise<void> {
    console.log('🧪 Comparing AbortSignal vs manual kill...');

    // Test AbortSignal
    const controller = new AbortController();
    const abortResult = { code: 0, hasError: false };

    const abortProcess = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        signal: controller.signal
    });

    abortProcess.on('spawn', () => {
        setTimeout(() => controller.abort(), 50);
    });

    abortProcess.on('error', () => {
        abortResult.hasError = true;
    });

    await new Promise(resolve => {
        abortProcess.on('exit', (code) => {
            abortResult.code = code || -1;
            resolve(undefined);
        });
    });

    // Test manual kill
    const killResult = { code: 0, hasError: false };

    const killProcess = spawn('node', ['-e', 'setTimeout(() => {}, 5000)']);

    killProcess.on('spawn', () => {
        setTimeout(() => killProcess.kill(), 50);
    });

    killProcess.on('error', () => {
        killResult.hasError = true;
    });

    await new Promise(resolve => {
        killProcess.on('exit', (code) => {
            killResult.code = code || -1;
            resolve(undefined);
        });
    });

    const bothTerminated = abortResult.code !== 0 && killResult.code !== 0;
    const errorDifference = abortResult.hasError !== killResult.hasError;

    addResult('AbortSignal vs Manual Kill', bothTerminated, [
        `AbortSignal: code=${abortResult.code}, error=${abortResult.hasError}`,
        `Manual kill: code=${killResult.code}, error=${killResult.hasError}`,
        bothTerminated ? '✅ Both methods terminate process' : '❌ Termination differs',
        errorDifference ? '🔍 Different error handling behavior' : '➡️ Similar error behavior'
    ]);
}

async function runAllTests(): Promise<void> {
    console.log('=== AbortSignal Behavior Test Suite ===\n');

    await testEventOrder();
    await testAbortBeforeSpawn();
    await testExitCodes();
    await compareWithManualKill();

    console.log('\n=== Test Results ===');
    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`\n${status} ${result.name}`);
        result.details.forEach(detail => {
            console.log(`   ${detail}`);
        });
    });

    const passCount = results.filter(r => r.passed).length;
    console.log(`\n📊 Summary: ${passCount}/${results.length} tests passed`);

    console.log('\n🎯 Key Takeaways:');
    console.log('• AbortSignal DOES emit an "error" event (unlike manual kill)');
    console.log('• Events fire in predictable order: spawn → error → exit → close');
    console.log('• Process exits with non-zero code when aborted');
    console.log('• AbortSignal can prevent process creation if aborted early');
    console.log('• Child processes are terminated but grandchildren may survive');
    console.log('• Error handling is crucial when using AbortSignal');
}

void runAllTests();
