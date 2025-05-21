import { URL } from 'node:url'

const MAX_RETRIES = 3

export async function fetchWithRetry(
  url: URL,
  options?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    if (!response.ok && retries > 0) {
      throw new Error(`Fetch failed with status ${response.status}`)
    }
    return response
  } catch (error) {
    if (retries <= 0) {
      throw error
    }
    return fetchWithRetry(url, options, retries - 1)
  }
}
