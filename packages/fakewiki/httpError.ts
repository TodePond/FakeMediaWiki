/**
 * Thrown when a Wikimedia/MediaWiki HTTP request returns a non-OK status.
 * Use `instanceof FakeWikiHttpError` and `status === 429` for rate-limit UI.
 */
export class FakeWikiHttpError extends Error {
	readonly status: number
	readonly requestUrl: string
	readonly endpointSummary: string

	constructor(
		message: string,
		status: number,
		requestUrl: string,
		endpointSummary: string
	) {
		super(message)
		this.name = "FakeWikiHttpError"
		this.status = status
		this.requestUrl = requestUrl
		this.endpointSummary = endpointSummary
	}
}
