export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}
