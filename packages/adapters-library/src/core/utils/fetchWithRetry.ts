const MAX_RETRIES = 1 // 1 retry after first failure

export async function fetchWithRetry(
  url: string | URL | Request,
  options?: RequestInit,
): Promise<Response> {
  return fetchWithRetryRecursive(url, options, MAX_RETRIES)
}

async function fetchWithRetryRecursive(
  url: string | URL | Request,
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
    return fetchWithRetryRecursive(url, options, retries - 1)
  }
}
