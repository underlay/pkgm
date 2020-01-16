import { URIComponents } from "uri-js"

export interface Package {
	created: Date
	modified: Date
	name: string
	description: null | string
	resource: URIComponents
	value: URIComponents
	extent: number
	revisionOf: null | URIComponents
	keywords: null | string[]
	members: Member[]
}

export type Member = PackageMember | MessageMember | FileMember

interface member {
	type: ResourceType
	value: URIComponents
}

export interface MessageMember extends member {
	type: ResourceType.Message
	resource: null | URIComponents
	title: null | string
}

export interface FileMember extends member {
	type: ResourceType.File
	format: string
	extent: number
	resource: null | URIComponents
	title: null | string
}

export interface PackageMember extends member {
	type: ResourceType.Package
	resource: URIComponents
	title: string
}

export enum ResourceType {
	Package = 1,
	Message,
	File,
}
