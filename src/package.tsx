import * as ShExParser from "@shex/parser"
import { URIComponents } from "uri-js"

import packageShexURL from "./package.shex"

export interface Package {
	created: Date
	modified: Date
	name: string
	description?: string
	resource: URIComponents
	value: URIComponents
	extent: number
	revisionOf?: URIComponents
	keywords?: string[]
	members: Member[]
}

export type Member = PackageMember | MessageMember | FileMember

interface member {
	type: ResourceType
}

export interface MessageMember extends member {
	type: ResourceType.Message
	resource?: URIComponents
	value: URIComponents
}

export interface FileMember extends member {
	type: ResourceType.File
	resource?: URIComponents
	value: URIComponents
	format: string
	extent: number
}

export interface PackageMember extends member {
	type: ResourceType.Package
	resource: URIComponents
	value: URIComponents
}

export enum ResourceType {
	Package = 1,
	Message,
	File,
}

export function parseSchema(shex: string): ShExParser.Schema {
	const parser = ShExParser.construct()
	const s: { start: string } = parser.parse(shex)
	return s
}

export const PackageSchema = fetch(packageShexURL)
	.then(res => res.text())
	.then(parseSchema)
