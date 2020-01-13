import { parse as parseURI, URIComponents } from "uri-js"

const linkHeader = /^<([:a-zA-Z0-9_\-\.\/#]+)>; rel=\"([a-z]+)\"$/

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
		const uri: URIComponents = { scheme, path, fragment }
		return uri
	} else {
		return null
	}
}
