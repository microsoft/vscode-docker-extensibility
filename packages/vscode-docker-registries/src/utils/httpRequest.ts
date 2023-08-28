/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request, RequestInit, Response, ResponseInit, default as fetch } from 'node-fetch';

export type HeadersLike = Record<string, string>;

export type RequestLike = RequestInit & {
    headers: HeadersLike;
};

export type ResponseLike<T> = ResponseInit & {
    headers: HeadersLike;
    status: number;
    statusText: string;
    json: () => Promise<T>;
};

export async function httpRequest<T>(url: string, request: RequestLike): Promise<ResponseLike<T>> {
    const fetchRequest = new Request(url, request);
    const response: Response = await fetch(fetchRequest);

    const headers: HeadersLike = {};
    for (const [header, value] of response.headers.entries()) {
        headers[header] = value;
    }

    if (response.status === 401) {
        throw new Error('Unauthorized request');
    }

    return {
        ...response,
        headers: headers,
        status: response.status,
        statusText: response.statusText,
        json: response.json.bind(response),
    };
}
