import * as React from "react"
import {
	Divider,
	Classes,
	FileInput,
	HTMLTable,
	AnchorButton,
} from "@blueprintjs/core"

import {
	parse as parseURI,
	serialize as serializeURI,
	URIComponents,
} from "uri-js"

import { ResourceType, Package, Member } from "./package"
import URIView from "./uri"

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

const gatewayURL = parseURI("http://localhost:8080")
const exploreURL = parseURI("http://localhost:8088")

export class PackageView extends React.Component<PackageProps, PackageState> {
	render() {
		const { p, uri } = this.props
		return (
			<React.Fragment>
				<h1 className={Classes.HEADING}>{p.name}</h1>
				<HTMLTable striped={true} condensed={true}>
					<tbody>
						<tr>
							<td>version</td>
							<td style={{ textAlign: "right" }}>
								<URIView uri={uri} />
								<AnchorButton
									href={serializeURI({
										...exploreURL,
										query: uri.path,
										fragment: uri.fragment,
									})}
									minimal={true}
									small={true}
									rightIcon="share"
								>
									open in explorer
								</AnchorButton>
							</td>
						</tr>
						<tr>
							<td>contents</td>
							<td style={{ textAlign: "right" }}>
								<URIView uri={p.value} />
								<div
									style={{
										display: "flex",
										justifyContent: "end",
										alignItems: "center",
									}}
								>
									<span style={{ padding: "0 7px" }}>{p.extent} bytes</span>|
									<AnchorButton
										href={serializeURI({ ...gatewayURL, path: p.value.path })}
										minimal={true}
										small={true}
										rightIcon="share"
									>
										open in IPFS gateway
									</AnchorButton>
								</div>
							</td>
						</tr>
						<tr>
							<td>created</td>
							<td className="date">{this.renderDate(p.created)}</td>
						</tr>
						<tr>
							<td>modified</td>
							<td className="date">{this.renderDate(p.modified)}</td>
						</tr>
						{p.revisionOf !== null && (
							<tr>
								<td>Revision of</td>
								<td colSpan={3}>
									<URIView uri={p.revisionOf} />
								</td>
							</tr>
						)}
						{p.keywords !== null && p.keywords.length > 0 && (
							<tr>
								<td>keywords</td>
								<td colSpan={3}>{p.keywords.join(", ")}</td>
							</tr>
						)}
						{p.description !== null && (
							<tr>
								<td>revision of</td>
								<td colSpan={3}>{p.description}</td>
							</tr>
						)}
					</tbody>
				</HTMLTable>
				<FileInput disabled={true} text="Add file..." />
			</React.Fragment>
		)
	}

	renderDate(date: Date) {
		return <span>{date.toUTCString()}</span>
	}

	static testExternal(
		a: URIComponents,
		b: URIComponents,
		name: string
	): boolean {
		return a.host === b.host && a.path === b.path + "/" + name
	}

	renderMember(member: Member): JSX.Element {
		const { p } = this.props
		switch (member.type) {
			case ResourceType.Package:
				const { title, resource } = member
				const className = PackageView.testExternal(p.resource, resource, title)
					? "external subpackage"
					: "subpackage"
				return <a className={className} href={title}></a>
			case ResourceType.Message:
				return null
			case ResourceType.File:
				return null
			default:
				return null
		}
	}
}
