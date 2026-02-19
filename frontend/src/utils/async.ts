const MIN_LOADING_MS = 500

export async function withMinDuration<T>(promise: Promise<T>, minMs = MIN_LOADING_MS): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise(resolve => setTimeout(resolve, minMs)),
  ])
  return result as T
}
