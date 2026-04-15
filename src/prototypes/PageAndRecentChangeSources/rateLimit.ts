export const API_RETRY_COUNT = 1
export const API_BASE_DELAY_MS = 100
export const API_RETRY_BACKOFF_MS = 1300

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		window.setTimeout(resolve, ms)
	})
}

export async function runWithRetry<T>(
	label: string,
	fn: () => Promise<T>,
	onLog: (message: string) => void
): Promise<T> {
	let attempt = 0
	let lastError: Error | null = null
	while (attempt <= API_RETRY_COUNT) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			if (attempt >= API_RETRY_COUNT) break
			const retryIn = API_RETRY_BACKOFF_MS * (attempt + 1)
			onLog(`${label} failed, retrying in ${retryIn}ms`)
			await sleep(retryIn)
		}
		attempt += 1
	}
	throw lastError ?? new Error(`${label} failed`)
}

export async function runSerialRequest<T>(
	label: string,
	request: () => Promise<T>,
	onLog: (message: string) => void,
	onDuration: (durationMs: number) => void
): Promise<T> {
	const startedAt = performance.now()
	const result = await runWithRetry(label, request, onLog)
	const durationMs = Math.round(performance.now() - startedAt)
	onDuration(durationMs)
	await sleep(API_BASE_DELAY_MS)
	return result
}
