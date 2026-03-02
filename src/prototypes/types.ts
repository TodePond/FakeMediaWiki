export type PrototypeDefinitionType = "prototype" | "variants" | "variant"

export type PrototypeStatus = "new" | "updated" | "wip"

export type PrototypeDefinitionBase = {
	id: string
	/** Component folder name to load; defaults to id when omitted */
	component?: string
	name: string
	description: string
	status?: PrototypeStatus
	featured?: boolean
}

export type PrototypeDefinitionPrototype = PrototypeDefinitionBase & {
	type: "prototype"
	title: string
	category: string
	wrapper: string
}

export type PrototypeDefinitionVariants = PrototypeDefinitionBase & {
	type: "variants"
	category: string
	variants: PrototypeDefinition<"variant">[]
}

export type PrototypeDefinitionVariant = PrototypeDefinitionBase & {
	type: "variant"
	title: string
	wrapper: string
}

export type PrototypeDefinition<T extends PrototypeDefinitionType = PrototypeDefinitionType> = (
	| PrototypeDefinitionPrototype
	| PrototypeDefinitionVariants
	| PrototypeDefinitionVariant
) & {
	type: T
}

export type CategoryDefinition = {
	id: string
	name: string
	description: string
}

export type WrapperDefinition = {
	id: string
	name: string
}
