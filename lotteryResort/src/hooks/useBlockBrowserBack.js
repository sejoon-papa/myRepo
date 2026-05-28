import { useEffect } from 'react'

/** 브라우저 뒤로가기(popstate)를 무시하고 현재 페이지에 유지 */
export function useBlockBrowserBack() {
  useEffect(() => {
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href)
    }

    blockBack()
    window.addEventListener('popstate', blockBack)

    return () => {
      window.removeEventListener('popstate', blockBack)
    }
  }, [])
}
