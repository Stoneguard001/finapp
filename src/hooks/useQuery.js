import { useState, useEffect } from 'react'

// Lightweight synchronous query hook for sql.js (no async needed — WASM runs sync)
export function useQuery(queryFn, deps = []) {
  const [data, setData]   = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      setData(queryFn())
      setError(null)
    } catch (e) {
      setError(e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error }
}
