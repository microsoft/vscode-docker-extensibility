/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { spawn, ChildProcess } from 'child_process';

describe('AbortSignal behavior with child_process.spawn', () => {
    let controller: AbortController;
    let childProcess: ChildProcess;

    beforeEach(() => {
        controller = new AbortController();
    });

    afterEach(() => {
        // Cleanup: make sure process is killed if still running
        if (childProcess && !childProcess.killed) {
            try {
                childProcess.kill('SIGKILL');
            } catch {
                // Ignore errors during cleanup
            }
        }
    });

    describe('Event order and timing', () => {
        it('should emit events in the correct order when aborted', (done) => {
            const events: Array<{ event: string; timestamp: number; data?: unknown }> = [];
            const startTime = Date.now();

            const logEvent = (event: string, data?: unknown) => {
                events.push({ event, timestamp: Date.now() - startTime, data });
            };

            // Use a command that works on both Windows and Unix
            const command = 'node';
            const args = ['-e', 'setTimeout(() => {}, 30000)'];

            childProcess = spawn(command, args, {
                signal: controller.signal
            });

            childProcess.on('spawn', () => logEvent('spawn'));
            childProcess.on('error', (err) => logEvent('error', err.message));
            childProcess.on('exit', (code, signal) => logEvent('exit', { code, signal }));
            childProcess.on('close', (code, signal) => logEvent('close', { code, signal }));

            // Wait a bit to ensure process is running, then abort
            setTimeout(() => {
                logEvent('abort_signal_sent');
                controller.abort();

                // Give some time for events to fire
                setTimeout(() => {
                    console.log('Event sequence:', events);

                    // Verify we got the expected events
                    const eventNames = events.map(e => e.event);
                    expect(eventNames).to.include('spawn');
                    expect(eventNames).to.include('abort_signal_sent');
                    expect(eventNames).to.include('exit');
                    expect(eventNames).to.include('close');

                    // Check that exit/close happened after abort
                    const abortIndex = eventNames.indexOf('abort_signal_sent');
                    const exitIndex = eventNames.indexOf('exit');
                    const closeIndex = eventNames.indexOf('close');

                    expect(exitIndex).to.be.greaterThan(abortIndex);
                    expect(closeIndex).to.be.greaterThan(abortIndex);
                    expect(closeIndex).to.be.greaterThanOrEqual(exitIndex);

                    done();
                }, 1000);
            }, 200);
        });

        it('should handle abortion before spawn completes', (done) => {
            // Abort immediately
            controller.abort();

            const events: string[] = [];

            try {
                childProcess = spawn('node', ['-e', 'console.log("hello")'], {
                    signal: controller.signal
                });

                childProcess.on('spawn', () => events.push('spawn'));
                childProcess.on('error', (err) => {
                    events.push('error');
                    console.log('Error when aborted before spawn:', err.message);

                    // Should get an error event, not spawn
                    expect(events).to.include('error');
                    expect(events).to.not.include('spawn');
                    // Note: On some platforms, this might be different error types
                    expect(['AbortError', 'Error'].includes(err.name)).to.be.true;
                    done();
                });
                childProcess.on('exit', () => events.push('exit'));
                childProcess.on('close', () => events.push('close'));

            } catch (err: unknown) {
                const error = err as Error;
                console.log('Synchronous error when aborted before spawn:', error.message);
                expect(['AbortError', 'Error'].includes(error.name)).to.be.true;
                done();
            }
        });
    });

    describe('Child process termination', () => {
        it('should kill the main process when aborted', (done) => {
            const command = 'node';
            const args = ['-e', 'setTimeout(() => {}, 30000)'];

            childProcess = spawn(command, args, {
                signal: controller.signal
            });

            childProcess.on('spawn', () => {
                console.log('Process spawned with PID:', childProcess.pid);

                // Abort after process is running
                setTimeout(() => {
                    controller.abort();
                }, 100);
            });

            childProcess.on('exit', (code, signal) => {
                console.log('Process exited - code:', code, 'signal:', signal);

                // Process should be terminated, not normal exit
                expect(code).to.not.equal(0);
                // Note: On Windows, signal might be null, but code will be non-zero

                done();
            });

            childProcess.on('error', (err) => {
                console.log('Process error:', err.message);
                done(err);
            });
        });
    });

    describe('AbortSignal integration patterns', () => {
        it('should work with timeout-based abortion', (done) => {
            // Create an AbortSignal that times out
            controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 500);

            const command = 'node';
            const args = ['-e', 'setTimeout(() => {}, 2000)'];

            childProcess = spawn(command, args, {
                signal: controller.signal
            });

            let wasAborted = false;

            childProcess.on('exit', (code, signal) => {
                clearTimeout(timeoutId);

                if (controller.signal.aborted) {
                    wasAborted = true;
                    console.log('Process was aborted by timeout - code:', code, 'signal:', signal);
                } else {
                    console.log('Process completed normally - code:', code, 'signal:', signal);
                }

                expect(wasAborted).to.be.true;
                done();
            });

            childProcess.on('error', (err) => {
                clearTimeout(timeoutId);
                console.log('Process error:', err.message);
                done(err);
            });
        });

        it('should handle multiple AbortController scenarios', (done) => {
            const controller1 = new AbortController();
            const controller2 = new AbortController();

            // Create a combined signal (Note: This requires Node.js 16+ for AbortSignal.any)
            let combinedSignal: AbortSignal;

            if (typeof AbortSignal.any === 'function') {
                combinedSignal = AbortSignal.any([controller1.signal, controller2.signal]);
            } else {
                // Fallback for older Node.js versions
                combinedSignal = controller1.signal;
            }

            const command = 'node';
            const args = ['-e', 'setTimeout(() => {}, 30000)'];

            childProcess = spawn(command, args, {
                signal: combinedSignal
            });

            childProcess.on('spawn', () => {
                // Abort using the second controller (or first if no AbortSignal.any)
                setTimeout(() => {
                    if (typeof AbortSignal.any === 'function') {
                        controller2.abort();
                    } else {
                        controller1.abort();
                    }
                }, 100);
            });

            childProcess.on('exit', (code, signal) => {
                console.log('Process exited with combined signal - code:', code, 'signal:', signal);
                expect(code).to.not.equal(0);
                done();
            });

            childProcess.on('error', (err) => {
                console.log('Process error with combined signal:', err.message);
                if (['AbortError', 'Error'].includes(err.name)) {
                    done(); // This is expected
                } else {
                    done(err);
                }
            });
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle abortion of non-existent command', (done) => {
            controller.abort();

            try {
                childProcess = spawn('nonexistent-command-12345', [], {
                    signal: controller.signal
                });

                childProcess.on('error', (err) => {
                    console.log('Error spawning non-existent command:', err.message);
                    // Should still get the spawn error, not just AbortError
                    done();
                });

            } catch (err: unknown) {
                const error = err as Error;
                console.log('Synchronous error spawning non-existent command:', error.message);
                done();
            }
        });

        it('should compare AbortSignal vs manual killing', (done) => {
            const results: Array<{ method: string, exitCode: number | null, signal: NodeJS.Signals | null }> = [];

            // Test 1: AbortSignal
            const abortController = new AbortController();
            const abortProcess = spawn('node', ['-e', 'setTimeout(() => {}, 30000)'], {
                signal: abortController.signal
            });

            abortProcess.on('spawn', () => {
                setTimeout(() => abortController.abort(), 100);
            });

            abortProcess.on('exit', (code, signal) => {
                results.push({ method: 'AbortSignal', exitCode: code, signal });

                // Test 2: Manual kill
                const manualProcess = spawn('node', ['-e', 'setTimeout(() => {}, 30000)']);

                manualProcess.on('spawn', () => {
                    setTimeout(() => manualProcess.kill(), 100);
                });

                manualProcess.on('exit', (code, signal) => {
                    results.push({ method: 'Manual kill', exitCode: code, signal });

                    console.log('Comparison results:', results);

                    // Both should result in non-zero exit codes
                    results.forEach(result => {
                        expect(result.exitCode).to.not.equal(0);
                    });

                    done();
                });

                manualProcess.on('error', (err) => {
                    console.log('Manual kill error:', err.message);
                    done(err);
                });
            });

            abortProcess.on('error', (err) => {
                console.log('AbortSignal error:', err.message);
                done(err);
            });
        });
    });
});
