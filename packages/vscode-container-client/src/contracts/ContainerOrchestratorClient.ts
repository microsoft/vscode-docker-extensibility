/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GeneratorCommandResponse, PromiseCommandResponse, VoidCommandResponse } from "./CommandRunner";
import { ClientIdentity, CommonCommandOptions } from "./ContainerClient";

// #region Container orchestrator commands
// Common command options
export type CommonOrchestratorCommandOptions = CommonCommandOptions & {
    /**
     * Orchestrator files, e.g. compose files
     */
    files?: Array<string>;
    /**
     * Environment variable file
     */
    environmentFile?: string;
    /**
     * Project name
     */
    projectName?: string;
    /**
     * Specific service profiles to start/stop/etc.
     */
    profiles?: Array<string>;
};

// Up command types
export type UpCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * Whether to build while up'ing
     */
    build?: boolean;
    /**
     * Whether to run in a detached session
     */
    detached?: boolean;
    /**
     * A timeout in seconds
     */
    timeoutSeconds?: number;
    /**
     * Whether to wait until services are running and healthy
     */
    wait?: boolean;
    /**
     * Specific services to start
     */
    services?: Array<string>;
    /**
     * Override specific service scaling
     */
    scale?: Record<string, number>;
    /**
     * If set to 'force', the `--force-recreate` flag is added, even if nothing has changed.
     * If set to `no`, the `--no-recreate` flag is added, and existing containers are not recreated.
     * If not set, no recreate flags are added.
     */
    recreate?: 'force' | 'no';
    /**
     * If true, the containers will be created but not started
     */
    noStart?: boolean;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type UpCommand = {
    /**
     * Generate a {@link VoidCommandResponse} for up'ing services with a container orchestrator
     * @param options Command options
     */
    up(options: UpCommandOptions): Promise<VoidCommandResponse>;
};

// Down command types
export type DownCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * Whether to remove named volumes
     */
    removeVolumes?: boolean;
    /**
    * Whether to remove images
    */
    removeImages?: 'all' | 'local';
    /**
     * A timeout in seconds
     */
    timeoutSeconds?: number;
    /**
     * Specific services to stop
     */
    services?: Array<string>;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type DownCommand = {
    /**
     * Generate a {@link VoidCommandResponse} for down'ing services with a container orchestrator
     * @param options Command options
     */
    down(options: DownCommandOptions): Promise<VoidCommandResponse>;
};

// Start command types
export type StartCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * Specific services to start
     */
    services?: Array<string>;
};

type StartCommand = {
    /**
     * Generate a {@link VoidCommandResponse} for starting services with a container orchestrator
     * @param options Command options
     */
    start(options: StartCommandOptions): Promise<VoidCommandResponse>;
};

// Stop command types
export type StopCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * A timeout in seconds
     */
    timeoutSeconds?: number;
    /**
     * Specific services to stop
     */
    services?: Array<string>;
};

type StopCommand = {
    /**
     * Generate a {@link VoidCommandResponse} for stopping services with a container orchestrator
     * @param options Command options
     */
    stop(options: StopCommandOptions): Promise<VoidCommandResponse>;
};

// Restart command types
export type RestartCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * A timeout in seconds
     */
    timeoutSeconds?: number;
    /**
     * Specific services to restart
     */
    services?: Array<string>;
};

type RestartCommand = {
    /**
     * Generate a {@link VoidCommandResponse} for restarting services with a container orchestrator
     * @param options Command options
     */
    restart(options: RestartCommandOptions): Promise<VoidCommandResponse>;
};

// Logs command types
export type LogsCommandOptions = CommonOrchestratorCommandOptions & {
    /**
     * Whether or not to follow the log output
     */
    follow?: boolean;
    /**
     * Maximum number of lines to show from the end of the logs
     */
    tail?: number;
    /**
     * Specific services to get logs for
     */
    services?: Array<string>;
};

type LogsCommand = {
    /**
     * Generate a {@link GeneratorCommandResponse} for getting collated logs from services with a container orchestrator
     * @param options Command options
     */
    logs(options: LogsCommandOptions): Promise<GeneratorCommandResponse<string>>;
};

// Config command types
// The `--profile` argument works, but has rather confusing results when used with the config command. Best to not support it.
export type ConfigCommandOptions = Omit<CommonOrchestratorCommandOptions, 'profiles'> & {
    configType: 'services' | 'images' | 'profiles' | 'volumes';
};

// The output is just a simple string
export type ConfigItem = string;

type ConfigCommand = {
    /**
     * Generate a {@link PromiseCommandResponse} for getting config information for services
     * @param options Command options
     */
    config(options: ConfigCommandOptions): Promise<PromiseCommandResponse<Array<ConfigItem>>>;
};

// #endregion

/**
 * Standard interface for executing commands against container runtimes.
 * Individual runtimes implement this interface.
 */
export interface IContainerOrchestratorClient extends
    ClientIdentity,
    UpCommand,
    DownCommand,
    StartCommand,
    StopCommand,
    RestartCommand,
    LogsCommand,
    ConfigCommand { }
