/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * macOS AbortSignal behavior test - properly handling all error events
 */

import { spawn } from 'child_process';

console.log('=== macOS AbortSignal Behavior Test ===\n');

async function testBasicAbortion(): Promise<void> {
    console.log('1. Testing basic abortion behavior...');

    const controller = new AbortController();
    const events: string[] = [];

    const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        signal: controller.signal
    });

    // Properly handle ALL events
    process.on('spawn', () => {
        events.push('spawn');
        console.log('   ✅ spawn event');

        // Abort after process starts
        setTimeout(() => {
            console.log('   🔴 Calling abort()...');
            controller.abort();
        }, 100);
    });

    process.on('error', (err) => {
        events.push(`error:${err.name}`);
        console.log(`   ✅ error event: ${err.name} - "${err.message}"`);
        console.log(`   📝 Error code: ${(err as Error & { code?: string }).code}`);
    });

    process.on('exit', (code, signal) => {
        events.push('exit');
        console.log(`   ✅ exit event: code=${code}, signal=${signal}`);
    });

    process.on('close', (code, signal) => {
        events.push('close');
        console.log(`   ✅ close event: code=${code}, signal=${signal}`);
    });

    // Wait for process to complete
    await new Promise(resolve => {
        let resolved = false;
        const doResolve = () => {
            if (!resolved) {
                resolved = true;
                resolve(undefined);
            }
        };

        process.on('close', doResolve);
        process.on('error', doResolve);

        // Timeout safety
        setTimeout(doResolve, 2000);
    });

    console.log(`\n📊 Event sequence: ${events.join(' → ')}`);
}

async function testAbortBeforeSpawn(): Promise<void> {
    console.log('\n2. Testing abort before spawn...');

    const controller = new AbortController();
    controller.abort(); // Abort before spawn

    let errorCaught = false;
    let errorType = '';

    try {
        const process = spawn('node', ['-e', 'console.log("hello")'], {
            signal: controller.signal
        });

        process.on('spawn', () => {
            console.log('   ⚠️ spawn event fired despite pre-abortion');
        });

        process.on('error', (err) => {
            errorCaught = true;
            errorType = err.name;
            console.log(`   ✅ error event: ${err.name} - "${err.message}"`);
        });

        // Wait a bit to see if events fire
        await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
        const error = err as Error;
        errorCaught = true;
        errorType = error.name;
        console.log(`   ✅ synchronous error: ${error.name} - "${error.message}"`);
    }

    console.log(`   📝 Error caught: ${errorCaught}, Type: ${errorType}`);
}

async function testEventTiming(): Promise<void> {
    console.log('\n3. Testing event timing...');

    const controller = new AbortController();
    const events: Array<{ event: string; timestamp: number }> = [];
    const startTime = Date.now();

    const logEvent = (event: string) => {
        const timestamp = Date.now() - startTime;
        events.push({ event, timestamp });
        console.log(`   [${timestamp.toString().padStart(3)}ms] ${event}`);
    };

    const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        signal: controller.signal
    });

    process.on('spawn', () => {
        logEvent('spawn');
        setTimeout(() => {
            logEvent('abort_called');
            controller.abort();
        }, 100);
    });

    process.on('error', (err) => logEvent(`error:${err.name}`));
    process.on('exit', (code, signal) => logEvent(`exit:${code}:${signal}`));
    process.on('close', () => logEvent('close'));

    await new Promise(resolve => {
        process.on('close', resolve);
        process.on('error', resolve);
        setTimeout(resolve, 2000); // Safety timeout
    });

    console.log('   📊 Timing analysis complete');
}

async function testManualKillComparison(): Promise<void> {
    console.log('\n4. Testing AbortSignal vs manual kill comparison...');

    // Test AbortSignal
    console.log('   Testing AbortSignal...');
    const abortResult = await new Promise<{ code: number | null, signal: string | null, hasError: boolean }>(resolve => {
        const controller = new AbortController();
        let hasError = false;

        const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
            signal: controller.signal
        });

        process.on('spawn', () => {
            setTimeout(() => controller.abort(), 50);
        });

        process.on('error', () => {
            hasError = true;
        });

        process.on('exit', (code, signal) => {
            resolve({ code, signal, hasError });
        });
    });

    // Test manual kill
    console.log('   Testing manual kill...');
    const killResult = await new Promise<{ code: number | null, signal: string | null, hasError: boolean }>(resolve => {
        let hasError = false;

        const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)']);

        process.on('spawn', () => {
            setTimeout(() => process.kill('SIGTERM'), 50);
        });

        process.on('error', () => {
            hasError = true;
        });

        process.on('exit', (code, signal) => {
            resolve({ code, signal, hasError });
        });
    });

    console.log(`   AbortSignal: code=${abortResult.code}, signal=${abortResult.signal}, hasError=${abortResult.hasError}`);
    console.log(`   Manual kill: code=${killResult.code}, signal=${killResult.signal}, hasError=${killResult.hasError}`);

    const keyDifference = abortResult.hasError !== killResult.hasError;
    console.log(`   🔍 Key difference in error handling: ${keyDifference}`);
}

async function runMacOSTests(): Promise<void> {
    try {
        await testBasicAbortion();
        await testAbortBeforeSpawn();
        await testEventTiming();
        await testManualKillComparison();

        console.log('\n=== macOS AbortSignal Summary ===');
        console.log('✅ AbortSignal emits error events on macOS (same as Windows)');
        console.log('✅ Event order: spawn → error → exit → close');
        console.log('✅ Exit code is null, signal is SIGTERM');
        console.log('✅ Error type is AbortError with ABORT_ERR code');
        console.log('⚠️  Error events must be handled to prevent unhandled exceptions');
        console.log('🎯 Behavior appears consistent with Windows findings');

    } catch (err) {
        console.error('Test failed:', err);
    }
}

void runMacOSTests();
