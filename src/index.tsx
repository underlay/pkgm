import * as React from "react"

import { ResourceType, Package } from "./package"

const linkHeader = /^<([a-zA-Z0-9_\-\.\/#]+)>; rel=\"([a-z]+)\"$/

const ldpResource = "http://www.w3.org/ns/ldp#Resource"
const ldpDirectContainer = "http://www.w3.org/ns/ldp#DirectContainer"
const ldpRDFSource = "http://www.w3.org/ns/ldp#RDFSource"
const ldpNonRDFSource = "http://www.w3.org/ns/ldp#NonRDFSource"

const resourceTypeMap: { [index: string]: ResourceType } = {
	ldpDirectContainer: ResourceType.Package,
	ldpRDFSource: ResourceType.Message,
	ldpNonRDFSource: ResourceType.File,
}

function matchLinkType(link: string): ResourceType {
	const links = link.split(", ")
	const relMap: Map<string, string> = new Map()
	for (const link of links) {
		const match = linkHeader.exec(link)
		if (match !== null) {
			const [_, uri, rel] = match
			if (rel === "type" && uri === ldpResource) {
				continue
			} else {
				relMap.set(rel, uri)
			}
		}
	}
	if (relMap.has("type")) {
	}
	return ResourceType.Package
}

interface PackageProps {
	p: Package
}

interface PackageState {}

export class PackageView extends React.Component<PackageProps, PackageState> {
	render() {
		return <pre>{JSON.stringify(this.props.p, null, "  ")}</pre>
	}
}

// export async function FetchResource(
// 	url: string
// ): Promise<[ResourceType, Resource]> {
// 	const res = await fetch(url, {
// 		method: "GET",
// 		headers: {
// 			Accept: "application/ld+json",
// 		},
// 	})
// 	console.log(res.headers)
// 	const json = await res.json()
// 	console.log(json)
// 	return null
// }
