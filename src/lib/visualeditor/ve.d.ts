/**
 * Minimal type declarations for VisualEditor globals used by FakeMediaWiki.
 * VE is loaded as a script bundle and exposes these on window.
 */
/* eslint-disable no-undef, no-unused-vars */
declare global {
	interface Window {
		ve: typeof ve
		OO: unknown
		$: unknown
	}

	 
	type VeDocument = any
	type VeTarget = any
	type VePlatform = any
	type VeDiffElement = any
}

declare const ve: {
	createDocumentFromHtml: (html: string) => Document
	properInnerHtml: (el: HTMLElement) => string
	messagePaths?: string[]
	init: {
		sa: {
			Platform: new (messagePaths: string[]) => VePlatform
			Target: new (config?: object) => VeTarget
		}
		platform?: VePlatform
		target?: VeTarget
	}
	dm: {
		converter: {
			getModelFromDom: (htmlDoc: Document, options?: { lang?: string; dir?: string }) => VeDocument
			getDomFromModel: (doc: VeDocument, mode?: number) => Document
		}
		VisualDiff: new (oldDoc: VeDocument, newDoc: VeDocument, timeout?: number) => any
	}
	ui: {
		DiffElement: new (visualDiff: any, config?: object) => any
	}
}

export {}
