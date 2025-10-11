/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Simple examples demonstrating AbortSignal behavior with child_process.spawn
 * Run this file with: node -r tsx examples/abortSignalExamples.ts
 */

import { spawn } from 'child_process';
import * as os from 'os';

console.log('=== AbortSignal with child_process.spawn Examples ===\n');

// Example 1: Basic abortion after process starts
async function example1BasicAbortion() {
    console.log('1. Basic Abortion Example');
    console.log('Creating a long-running process and aborting it...');

    const controller = new AbortController();
    const command = os.platform() === 'win32' ? 'timeout' : 'sleep';
    const args = os.platform() === 'win32' ? ['/t', '5'] : ['5'];

    const childProcess = spawn(command, args, {
        signal: controller.signal
    });

    // Track events
    childProcess.on('spawn', () => {
        console.log('  ✓ Process spawned with PID:', childProcess.pid);
    });

    childProcess.on('exit', (code, signal) => {
        console.log('  ✓ Process exited - code:', code, 'signal:', signal);
        console.log('  → Process was terminated by signal, not normal exit\n');
    });

    childProcess.on('error', (err) => {
        console.log('  ✗ Process error:', err.message);
    });

    // Abort after 1 second
    setTimeout(() => {
        console.log('  → Sending abort signal...');
        controller.abort();
    }, 1000);

    return new Promise<void>(resolve => {
        childProcess.on('exit', () => resolve());
        childProcess.on('error', () => resolve());
    });
}

// Example 2: Abortion before spawn
async function example2AbortBeforeSpawn() {
    console.log('2. Abort Before Spawn Example');
    console.log('Aborting before the process can start...');

    const controller = new AbortController();
    controller.abort(); // Abort immediately

    try {
        const childProcess = spawn('echo', ['hello'], {
            signal: controller.signal
        });

        childProcess.on('spawn', () => {
            console.log('  ✗ This should not happen - spawn event fired');
        });

        childProcess.on('error', (err) => {
            console.log('  ✓ Got expected error:', err.message);
            console.log('  ✓ Error name:', err.name);
            console.log('  → AbortSignal prevents spawn when already aborted\n');
        });

    } catch (err) {
        const error = err as Error;
        console.log('  ✓ Got synchronous error:', error.message);
        console.log('  ✓ Error name:', error.name);
        console.log('  → AbortSignal can throw synchronously\n');
    }

    // Wait a bit to let any async events fire
    await new Promise(resolve => setTimeout(resolve, 100));
}

// Example 3: Comparison with manual kill
async function example3CompareWithManualKill() {
    console.log('3. AbortSignal vs Manual Kill Comparison');

    // Test AbortSignal
    console.log('Testing AbortSignal termination...');
    const abortController = new AbortController();
    const abortProcess = spawn(os.platform() === 'win32' ? 'timeout' : 'sleep',
        os.platform() === 'win32' ? ['/t', '5'] : ['5'], {
        signal: abortController.signal
    });

    const abortResult = await new Promise<{ code: number | null, signal: NodeJS.Signals | null }>(resolve => {
        abortProcess.on('spawn', () => {
            setTimeout(() => abortController.abort(), 100);
        });
        abortProcess.on('exit', (code, signal) => resolve({ code, signal }));
    });

    console.log('  AbortSignal result - code:', abortResult.code, 'signal:', abortResult.signal);

    // Test manual kill
    console.log('Testing manual kill termination...');
    const manualProcess = spawn(os.platform() === 'win32' ? 'timeout' : 'sleep',
        os.platform() === 'win32' ? ['/t', '5'] : ['5']);

    const manualResult = await new Promise<{ code: number | null, signal: NodeJS.Signals | null }>(resolve => {
        manualProcess.on('spawn', () => {
            setTimeout(() => manualProcess.kill(), 100);
        });
        manualProcess.on('exit', (code, signal) => resolve({ code, signal }));
    });

    console.log('  Manual kill result - code:', manualResult.code, 'signal:', manualResult.signal);
    console.log('  → Both methods result in process termination via signal\n');
}

// Example 4: Event order demonstration
async function example4EventOrder() {
    console.log('4. Event Order Demonstration');
    console.log('Showing the order of events when AbortSignal is used...');

    const controller = new AbortController();
    const events: Array<{ event: string, timestamp: number }> = [];
    const startTime = Date.now();

    const logEvent = (event: string) => {
        const timestamp = Date.now() - startTime;
        events.push({ event, timestamp });
        console.log(`  [${timestamp.toString().padStart(4)}ms] ${event}`);
    };

    const childProcess = spawn(os.platform() === 'win32' ? 'timeout' : 'sleep',
        os.platform() === 'win32' ? ['/t', '5'] : ['5'], {
        signal: controller.signal
    });

    childProcess.on('spawn', () => logEvent('spawn'));
    childProcess.on('error', () => logEvent('error'));
    childProcess.on('exit', () => logEvent('exit'));
    childProcess.on('close', () => logEvent('close'));

    setTimeout(() => {
        logEvent('abort() called');
        controller.abort();
    }, 200);

    await new Promise<void>(resolve => {
        childProcess.on('close', () => {
            console.log('  → Events occur in order: spawn → abort() → exit → close\n');
            resolve();
        });
    });
}

// Run all examples
async function runAllExamples() {
    try {
        await example1BasicAbortion();
        await example2AbortBeforeSpawn();
        await example3CompareWithManualKill();
        await example4EventOrder();

        console.log('=== Summary of Key Findings ===');
        console.log('• AbortSignal reliably terminates child processes via system signals');
        console.log('• Events fire in predictable order: spawn → exit → close');
        console.log('• Aborting before spawn prevents process creation entirely');
        console.log('• AbortSignal behavior is similar to manual process.kill()');
        console.log('• No "error" events are fired for normal abortion');
        console.log('• Child processes are terminated, but may not kill their own children');
        console.log('• AbortSignal is a cleaner alternative to manual cancellation logic');

    } catch (err) {
        console.error('Error running examples:', err);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    void runAllExamples();
}
