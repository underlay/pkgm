import { parse as parseURI, URIComponents } from "uri-js"
import { Store, DataFactory } from "n3"
import { Package, ResourceType, Member, FileMember } from "./package"

import { dcterms, prov, ldp } from "./vocab"

const linkHeader = /^<([:a-zA-Z0-9_\-\.\/#]+)>; rel=\"([a-z]+)\"$/

const uriTypes: Map<ResourceType, RegExp> = new Map([
	[ResourceType.File, /^dweb:\/ipfs\/[a-z2-7]{59}$/],
	[ResourceType.Message, /^u:[a-z2-7]{59}$/],
	[ResourceType.Package, /^u:[a-z2-7]{59}#_:c14n\d+$/],
])

export function parseLinkHeader(header: string): Map<string, URIComponents[]> {
	const links = header.split(", ")
	const relMap: Map<string, URIComponents[]> = new Map()
	for (const link of links) {
		const match = linkHeader.exec(link)
		if (match !== null) {
			const [_, target, rel] = match
			const uri = parseURI(target)
			if (relMap.has(rel)) {
				relMap.get(rel).push(uri)
			} else {
				relMap.set(rel, [uri])
			}
		}
	}
	return relMap
}

const etagTest = /^\"([a-z1-7]{59})\"$/
const scheme = "u"
export function parseVersionURI(headers: Headers): URIComponents {
	const match = etagTest.exec(headers.get("ETag"))
	const links = parseLinkHeader(headers.get("Link")).get("self")
	if (match !== null && links !== undefined && links.length === 1) {
		const [{ fragment }] = links
		const [_, path] = match
		return { scheme, path, fragment }
	} else {
		return null
	}
}

export function patchPackage(p: Package, store: Store, subject: string) {
	const keyword = DataFactory.namedNode(dcterms.subject)
	if (store.countQuads(null, keyword)) {
		p.keywords = []
	}

	store.forEach(({ predicate: { value: property }, object: { value } }) => {
		if (property === dcterms.modified) {
			p.modified = new Date(value)
		} else if (property === dcterms.description) {
			p.description = value
		} else if (property === dcterms.subject) {
			p.keywords.push(value)
		} else if (property === prov.wasRevisionOf) {
			p.revisionOf = parseURI(value)
		} else if (property === prov.hadMember) {
			let member: Partial<Member> = null
			for (const [t, r] of uriTypes) {
				if (r.test(value)) {
					member = { type: t, value: parseURI(value) }
					break
				}
			}
			if (member === null) {
				console.error("Invalid resource type", value)
			} else {
				store.forEach(({ predicate: { value: p }, object: { value: v } }) => {
					if (p === ldp.membershipResource) {
						member.resource = parseURI(v)
					} else if (p === dcterms.title) {
						member.title = v
					} else if (p === dcterms.format) {
						;(member as Partial<FileMember>).format = v
					} else if (p === dcterms.extent) {
						;(member as Partial<FileMember>).extent = parseInt(v)
					}
				}, DataFactory.namedNode(value))
				p.members.push(member as Member)
			}
		}
	}, DataFactory.namedNode(subject))
}
