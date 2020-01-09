import * as React from "react"

import {
	parse as parseURI,
	serialize as serializeURI,
	URIComponents,
} from "uri-js"

import { ResourceType, Package, Member } from "./package"

const linkHeader = /^<([:a-zA-Z0-9_\-\.\/#]+)>; rel=\"([a-z]+)\"$/

const ldpResource = "http://www.w3.org/ns/ldp#Resource"
const ldpDirectContainer = "http://www.w3.org/ns/ldp#DirectContainer"
const ldpRDFSource = "http://www.w3.org/ns/ldp#RDFSource"
const ldpNonRDFSource = "http://www.w3.org/ns/ldp#NonRDFSource"

const resourceTypeMap: { [index: string]: ResourceType } = {
	ldpDirectContainer: ResourceType.Package,
	ldpRDFSource: ResourceType.Message,
	ldpNonRDFSource: ResourceType.File,
}

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

interface PackageProps {
	p: Package
	uri: URIComponents
}

interface PackageState {}

const gatewayOrigin = "http://localhost:8080"

export class PackageView extends React.Component<PackageProps, PackageState> {
	render() {
		const { p, uri } = this.props
		return (
			<div>
				<h1>{p.name}</h1>
				<dl>
					<dt>Version URI</dt>
					<dd>{serializeURI(uri)}</dd>
					<dt>Directory value</dt>
					<dd>
						<span className="uri">{serializeURI(p.value)}</span>
						<br />
						{p.extent} bytes -{" "}
						<a href={gatewayOrigin + p.value.path}>open in IPFS gateway</a>
					</dd>
					<dt>Created</dt>
					<dd>{p.created.toUTCString()}</dd>
					<dt>Modified</dt>
					<dd>{p.modified.toUTCString()}</dd>
					{p.revisionOf !== null && (
						<React.Fragment>
							<dt>Revision of</dt>
							<dd>{serializeURI(p.revisionOf)}</dd>
						</React.Fragment>
					)}
					{p.keywords !== null && p.keywords.length > 0 && (
						<React.Fragment>
							<dt>Description</dt>
							<dd>{p.keywords.join(", ")}</dd>
						</React.Fragment>
					)}
					{p.description !== null && (
						<React.Fragment>
							<dt>Description</dt>
							<dd>{p.description}</dd>
						</React.Fragment>
					)}
					<dt>Members</dt>
					<dd>
						{p.members.length ? (
							<ul>
								{p.members.map((member, i) => (
									<li key={i}>{member.type}</li>
								))}
							</ul>
						) : (
							"Package is empty"
						)}
					</dd>
				</dl>
				<pre>{JSON.stringify(p, null, "  ")}</pre>
			</div>
		)
	}
}

function renderMember(member: Member): JSX.Element {
	switch (member.type) {
		case ResourceType.Package:
			return null
		case ResourceType.Message:
			return null
		case ResourceType.File:
			return null
		default:
			return null
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
