/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request, RequestInit, Response, ResponseInit, default as fetch } from 'node-fetch';
import { UnauthorizedError } from './errors';

export type HeadersLike = Record<string, string>;

export type RequestLike = RequestInit & {
    headers: HeadersLike;
};

export type ResponseLike<T> = ResponseInit & {
    headers: HeadersLike;
    status: number;
    statusText: string;
    succeeded: boolean;
    json: () => Promise<T>;
};

export async function httpRequest<T>(url: string, request: RequestLike, throwOnFailure: boolean = true): Promise<ResponseLike<T>> {
    const fetchRequest = new Request(url, request);
    const response: Response = await fetch(fetchRequest);

    const headers: HeadersLike = {};
    for (const [header, value] of response.headers.entries()) {
        headers[header] = value;
    }

    if (throwOnFailure && response.status === 401) {
        throw new UnauthorizedError(`Request to ${url} failed with status code 401: Unauthorized`);
    }

    return {
        ...response,
        headers: headers,
        status: response.status,
        statusText: response.statusText,
        succeeded: response.status >= 200 && response.status < 300,
        json: response.json.bind(response),
    };
}
