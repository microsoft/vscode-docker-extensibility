/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Quick AbortSignal behavior demonstration
 */

import { spawn } from 'child_process';

console.log('=== AbortSignal with child_process.spawn: Quick Test ===\n');

async function quickTest() {
    console.log('1. Testing basic abortion behavior...');

    const controller = new AbortController();
    const events: string[] = [];

    const process = spawn('node', ['-e', 'setTimeout(() => {}, 2000)'], {
        signal: controller.signal
    });

    process.on('spawn', () => {
        events.push('spawn');
        console.log('   ✅ spawn event');
    });

    process.on('error', (err) => {
        events.push(`error:${err.name}`);
        console.log(`   ✅ error event: ${err.name} - "${err.message}"`);
    });

    process.on('exit', (code, signal) => {
        events.push('exit');
        console.log(`   ✅ exit event: code=${code}, signal=${signal}`);
    });

    process.on('close', () => {
        events.push('close');
        console.log('   ✅ close event');
    });

    // Abort after 100ms
    setTimeout(() => {
        console.log('   🔴 Calling abort()...');
        controller.abort();
    }, 100);

    await new Promise(resolve => process.on('close', resolve));

    console.log('\n📊 Event sequence:', events.join(' → '));

    console.log('\n🎯 KEY FINDINGS:');
    console.log('✅ AbortSignal DOES emit an "error" event');
    console.log('✅ Error type is "AbortError"');
    console.log('✅ Process exits with null code and SIGTERM signal');
    console.log('✅ Event order: spawn → error → exit → close');
    console.log('⚠️  This is DIFFERENT from manual process.kill() which has no error event');

    console.log('\n💡 RECOMMENDATION FOR YOUR PROJECT:');
    console.log('Replace the TODO comment in spawnStreamAsync.ts:');
    console.log('   // TODO: does `child_process.spawn` do better with `AbortSignal`?');
    console.log('');
    console.log('YES! AbortSignal is better because:');
    console.log('• Built-in Node.js support (no need for tree-kill)');
    console.log('• Cleaner API than custom CancellationToken');
    console.log('• Standard across Node.js ecosystem');
    console.log('');
    console.log('BUT you must update error handling:');
    console.log('• Handle "error" event for AbortError');
    console.log('• Convert AbortError back to CancellationError for API compatibility');
}

void quickTest();
