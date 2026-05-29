function parseJsonResponse(text) {
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'API 서버에 연결할 수 없습니다. 터미널에서 npm run dev 로 프론트·API를 함께 실행해 주세요.',
      )
    }
    throw new Error('서버 응답을 처리할 수 없습니다.')
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  const data = parseJsonResponse(text)

  if (!response.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}
