import { createHash } from 'node:crypto'
import { http, bypass } from 'msw'
import { setupServer } from 'msw/node'
import { Json } from '../types/json'

type RpcRequest = {
  method: string
  params: Json[]
  id: number
}

export type RpcInterceptedRequest = Record<string, unknown>

function createKey(url: string, requestBody: Json) {
  return createHash('md5')
    .update(url + JSON.stringify(requestBody))
    .digest('hex')
}

function slimRequest({ method, params }: RpcRequest) {
  return {
    method,
    params,
  }
}

function createResponse(body: ArrayBuffer) {
  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: new Headers([
      ['content-length', body.byteLength.toString()],
      ['content-type', 'application/json'],
    ]),
  })
}

export const startRpcSnapshot = (chainProviderUrls: string[]) => {
  const interceptedRequests: RpcInterceptedRequest = {}

  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const response = await fetch(bypass(request))

        if (response.status !== 200) {
          console.warn('RPC request failed')
          return response
        }

        const requestBody = (await request.clone().json()) as RpcRequest
        const slimRequestBody = slimRequest(requestBody)

        const key = createKey(url, slimRequestBody)

        const body = await response.arrayBuffer()

        interceptedRequests[key] = JSON.parse(
          new TextDecoder().decode(body),
        ).result

        return createResponse(body)
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    interceptedRequests,
    stop: () => server.close(),
  }
}

export const startRpcMock = (
  // TODO When we use this for every test case, we can make this required and throw if an rpc request is not there
  interceptedRequests: RpcInterceptedRequest | undefined,
  chainProviderUrls: string[],
) => {
  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const requestBody = await request.clone().json()
        const slimRequestBody = slimRequest(requestBody)

        const key = createKey(url, slimRequestBody)

        const storedResponse = interceptedRequests?.[key]
        const responseBody = storedResponse
          ? new TextEncoder().encode(
              JSON.stringify({
                result: storedResponse,
                id: requestBody.id,
                jsonrpc: '2.0',
              }),
            ).buffer
          : await (await fetch(bypass(request))).arrayBuffer()

        return createResponse(responseBody)
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    stop: () => server.close(),
  }
}
