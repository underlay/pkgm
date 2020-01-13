import * as React from "react"
import {
	Classes,
	Button,
	FileInput,
	HTMLTable,
	InputGroup,
	AnchorButton,
	ProgressBar,
	Dialog,
} from "@blueprintjs/core"

import { DataFactory } from "n3"

import {
	parse as parseURI,
	serialize as serializeURI,
	URIComponents,
} from "uri-js"

import { ResourceType, Package, Member, PackageSchema } from "./package"
import URIView from "./uri"
import { parseDataset, validatePackage } from "./parse"
import { parseLinkHeader, parseVersionURI } from "./utils"

const ldpResource = "http://www.w3.org/ns/ldp#Resource"
const ldpDirectContainer = "http://www.w3.org/ns/ldp#DirectContainer"
const ldpRDFSource = "http://www.w3.org/ns/ldp#RDFSource"
const ldpNonRDFSource = "http://www.w3.org/ns/ldp#NonRDFSource"

const resourceTypeMap: { [index: string]: ResourceType } = {
	ldpDirectContainer: ResourceType.Package,
	ldpRDFSource: ResourceType.Message,
	ldpNonRDFSource: ResourceType.File,
}

interface PackageProps {
	// p: Package
	url: string
	// uri: URIComponents
}

interface PackageState {
	editDescription: boolean
	editDescriptionPending: boolean
	p: Package
	uri: URIComponents
}

const gatewayURL = parseURI("http://localhost:8080")
const exploreURL = parseURI("http://localhost:8088")

const descriptionIRI = "http://purl.org/dc/terms/description"
const modifiedIRI = "http://purl.org/dc/terms/modified"
const wasRevisionOfIRI = "http://www.w3.org/ns/prov#wasRevisionOf"

export class PackageView extends React.Component<PackageProps, PackageState> {
	constructor(props: PackageProps) {
		super(props)
		this.state = {
			editDescription: false,
			editDescriptionPending: false,
			p: null,
			uri: null,
		}
	}
	async componentDidMount() {
		const res = await fetch(this.props.url, {
			method: "GET",
			headers: { Accept: "application/n-quads" },
		})

		const uri = parseVersionURI(res.headers)
		if (uri !== null) {
			const store = await res.text().then(parseDataset)
			const p = validatePackage(await PackageSchema, store, uri.fragment)
			this.setState({ p, uri })
		}
	}
	handleEditDescription = () => this.setState({ editDescription: true })
	handleCancelEditDescription = () => this.setState({ editDescription: false })
	handleCommitEditDescription = async (description: string) => {
		const { url } = this.props
		const {
			p,
			uri: { path, fragment },
		} = this.state
		this.setState({ editDescriptionPending: true })
		const object = JSON.stringify(description)
		const res = await fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/n-quads",
				"If-Match": `"${path}"`,
				Link: `<#${fragment}>; rel="self"`,
			},
			body: `${fragment} <${descriptionIRI}> ${object} .\n`,
		})
		const uri = parseVersionURI(res.headers)
		if (res.status === 204) {
			this.setState({ editDescriptionPending: false, editDescription: false })
		} else if (res.status === 200 && uri !== null) {
			const store = await res.text().then(parseDataset)
			const [
				{
					object: { value: modified },
				},
			] = store.getQuads(null, DataFactory.namedNode(modifiedIRI), null, null)
			const [
				{
					object: { value: revisionOf },
				},
			] = store.getQuads(
				null,
				DataFactory.namedNode(wasRevisionOfIRI),
				null,
				null
			)
			p.description = description
			p.modified = new Date(modified)
			p.revisionOf = parseURI(revisionOf)
			this.setState({
				uri,
				editDescriptionPending: false,
				editDescription: false,
			})
		} else {
			console.error(res.status, res.statusText, await res.text())
		}
	}
	render() {
		const { p, uri } = this.state
		if (p === null) {
			return <p>Loading...</p>
		}
		console.log(uri)
		return (
			<React.Fragment>
				<header>
					<h3 className={Classes.HEADING}>{p.name}</h3>
					<URIView uri={p.resource} />
				</header>
				<HTMLTable striped={true} condensed={true}>
					<tbody>
						<tr>
							{this.renderLabel("version")}
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
							{this.renderLabel("contents")}
							<td style={{ textAlign: "right" }}>
								<URIView uri={p.value} />
								<div
									style={{
										display: "flex",
										justifyContent: "end",
										alignItems: "center",
									}}
								>
									<span style={{ padding: "0 10px" }}>{p.extent} bytes</span>|
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
							{this.renderLabel("created")}
							<td className="date">{this.renderDate(p.created)}</td>
						</tr>
						<tr>
							{this.renderLabel("modified")}
							<td className="date">{this.renderDate(p.modified)}</td>
						</tr>
						{p.revisionOf !== null && (
							<tr>
								{this.renderLabel("revision of")}
								<td colSpan={3}>
									<URIView uri={p.revisionOf} />
								</td>
							</tr>
						)}
						{p.keywords !== null && p.keywords.length > 0 && (
							<tr>
								{this.renderLabel("keywords")}
								<td>keywords</td>
								<td colSpan={3}>{p.keywords.join(", ")}</td>
							</tr>
						)}
						{p.description !== null && (
							<tr>
								{this.renderLabel("description")}
								<td colSpan={3} style={{ display: "flex" }}>
									<div style={{ flex: 1, marginRight: "1em" }}>
										{p.description}
									</div>
									<Button
										icon="edit"
										onClick={this.handleEditDescription}
										small={true}
										minimal={true}
									/>
									<EditDescription
										isOpen={this.state.editDescription}
										isPending={this.state.editDescriptionPending}
										description={p.description}
										onCancel={this.handleCancelEditDescription}
										onChange={this.handleCommitEditDescription}
									/>
								</td>
							</tr>
						)}
					</tbody>
				</HTMLTable>
				<FileInput disabled={true} text="Add file..." />
			</React.Fragment>
		)
	}

	renderLabel(label: string): JSX.Element {
		return (
			<td>
				<div style={{ width: "max-content" }}>{label}</div>
			</td>
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
		const { p } = this.state
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

interface EditDescriptionProps {
	isOpen: boolean
	isPending: boolean
	description: string
	onChange: (description: string) => void
	onCancel: () => void
}

interface EditDescriptionState {
	value: string
}

class EditDescription extends React.Component<
	EditDescriptionProps,
	EditDescriptionState
> {
	constructor(props: EditDescriptionProps) {
		super(props)
		this.state = { value: props.description }
	}
	handleChange = (
		event: React.FormEvent<HTMLElement> & React.ChangeEvent<HTMLElement>
	) => this.setState({ value: (event.target as HTMLInputElement).value })
	handleCommit = () => this.props.onChange(this.state.value)
	handleCancel = () => {
		this.setState({ value: this.props.description })
		this.props.onCancel()
	}
	render() {
		const { isOpen, isPending } = this.props
		return (
			<Dialog isOpen={isOpen}>
				<div className={Classes.DIALOG_HEADER}>
					<h4 className={Classes.HEADING}>Edit package description</h4>
				</div>
				<div className={Classes.DIALOG_BODY}>
					<InputGroup
						value={this.state.value}
						onChange={this.handleChange}
						placeholder="Add a description..."
					/>
				</div>
				<div
					className={Classes.DIALOG_FOOTER}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "end",
					}}
				>
					{isPending && <ProgressBar />}
					<div className={Classes.DIALOG_FOOTER_ACTIONS}>
						<Button
							onClick={this.handleCancel}
							intent="none"
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={this.handleCommit}
							intent="primary"
							disabled={isPending}
						>
							Save
						</Button>
					</div>
				</div>
			</Dialog>
		)
	}
}
