import * as ShExParser from "@shex/parser"
import { URIComponents } from "uri-js"

import packageShexURL from "./package.shex"

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
}

export interface MessageMember extends member {
	type: ResourceType.Message
	value: URIComponents
	resource: null | URIComponents
	title: null | string
}

export interface FileMember extends member {
	type: ResourceType.File
	value: URIComponents
	format: string
	extent: number
	resource: null | URIComponents
	title: null | string
}

export interface PackageMember extends member {
	type: ResourceType.Package
	value: URIComponents
	resource: URIComponents
	title: string
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