export type ProseSegment = { type: "markdown"; content: string }

export type RequestPairSegment = {
	type: "requestPair"
	requestBash: string
	responseJson: string
}

export type ContentSegment = ProseSegment | RequestPairSegment

export type SectionBlock = {
	id: string
	anchor: string
	headingLine: string
	titleText: string
	segments: ContentSegment[]
}

export type FileBlock = {
	slug: string
	title: string
	preamble: string
	sections: SectionBlock[]
}

export type SectionsPayload = {
	version: number
	generatedBy?: string
	files: FileBlock[]
}
