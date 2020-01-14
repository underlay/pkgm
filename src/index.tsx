import * as React from "react"
import {
	Classes,
	Button,
	HTMLTable,
	InputGroup,
	AnchorButton,
	ProgressBar,
	Dialog,
	Divider,
	FormGroup,
	FileInput,
} from "@blueprintjs/core"

import {
	parse as parseURI,
	serialize as serializeURI,
	URIComponents,
} from "uri-js"

import { ResourceType, Package, Member, PackageSchema } from "./package"
import URIView from "./uri"
import { parseDataset, validatePackage } from "./parse"
import { parseVersionURI, patchPackage } from "./utils"

import { dcterms, ldp } from "./vocab"

const resourceTypeMap: { [index: string]: ResourceType } = {
	[ldp.directContainer]: ResourceType.Package,
	[ldp.rdfSource]: ResourceType.Message,
	[ldp.nonRDFSource]: ResourceType.File,
}

interface PackageProps {
	url: string
}

interface PackageState {
	editDescription: boolean
	editDescriptionPending: boolean
	p: Package
	uri: URIComponents
	error: any
}

const gatewayURL = parseURI("http://localhost:8080")
const exploreURL = parseURI("http://localhost:8088")

export class PackageView extends React.Component<PackageProps, PackageState> {
	constructor(props: PackageProps) {
		super(props)
		this.state = {
			editDescription: false,
			editDescriptionPending: false,
			p: null,
			uri: null,
			error: null,
		}
	}
	componentDidMount() {
		fetch(this.props.url, {
			method: "GET",
			headers: { Accept: "application/n-quads" },
		})
			.then(async res => {
				const uri = parseVersionURI(res.headers)
				if (uri !== null) {
					const store = await res.text().then(parseDataset)
					const p = validatePackage(await PackageSchema, store, uri.fragment)
					this.setState({ p, uri })
				}
			})
			.catch(err => this.setState({ error: err }))
	}
	handleEditDescription = () => this.setState({ editDescription: true })
	handleCancelEditDescription = () => this.setState({ editDescription: false })
	handleCommitEditDescription = async (description: string) => {
		const {
			p,
			uri: { path, fragment },
		} = this.state
		this.setState({ editDescriptionPending: true })
		const object = JSON.stringify(description)
		const res = await fetch(this.props.url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/n-quads",
				"If-Match": `"${path}"`,
				Link: `<#${fragment}>; rel="self"`,
			},
			body: `${fragment} <${dcterms.description}> ${object} .\n`,
		})
		const uri = parseVersionURI(res.headers)
		if (res.status === 204) {
			this.setState({ editDescriptionPending: false, editDescription: false })
		} else if (res.status === 200 && uri !== null) {
			const store = await res.text().then(parseDataset)
			console.log("response store!", store, uri.fragment)
			patchPackage(p, store, uri.fragment)
			this.setState({
				p,
				uri,
				editDescriptionPending: false,
				editDescription: false,
			})
		} else {
			console.error(res.status, res.statusText, await res.text())
		}
	}
	render() {
		const { p, uri, error } = this.state
		if (error !== null) {
			return (
				<React.Fragment>
					<h6 className={Classes.HEADING}>Could not load package</h6>
					<p>
						<code>{error.toString()}</code>
					</p>
				</React.Fragment>
			)
		} else if (p === null) {
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
							<td>
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
							<td>
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
									<AnchorButton
										href={serializeURI({
											...exploreURL,
											query: p.revisionOf.path,
											fragment: p.revisionOf.fragment,
										})}
										minimal={true}
										small={true}
										rightIcon="share"
									>
										open in explorer
									</AnchorButton>
								</td>
							</tr>
						)}
						<tr>
							{this.renderLabel("description")}
							<td colSpan={3} style={{ display: "flex" }}>
								<div style={{ flex: 1, marginRight: "1em" }}>
									{p.description || <i>No description</i>}
								</div>
								<Button
									className="edit"
									icon="edit"
									onClick={this.handleEditDescription}
									small={true}
									minimal={true}
								/>
								<EditDescription
									isOpen={this.state.editDescription}
									isPending={this.state.editDescriptionPending}
									description={p.description || ""}
									onCancel={this.handleCancelEditDescription}
									onChange={this.handleCommitEditDescription}
								/>
							</td>
						</tr>
					</tbody>
				</HTMLTable>
				<Divider />
				<section>
					<h4 className={Classes.HEADING}>Add resources</h4>
					<FileInput
						inputProps={{ multiple: true }}
						text="Upload files..."
						buttonText="Browse"
						onInputChange={(event: React.FormEvent<HTMLInputElement>) => {
							const { files } = event.target as HTMLInputElement
							const formData = new FormData()
							for (const file of files) {
								formData.append(file.name, file, file.name)
							}

							fetch(this.props.url, {
								method: "POST",
								body: formData,
								headers: { "If-Match": `"${this.state.uri.path}"` },
							})
								.then(async res => {
									if (res.status === 204) {
									} else if (res.status === 200) {
										const { p } = this.state
										const uri = parseVersionURI(res.headers)
										const store = await res.text().then(parseDataset)
										patchPackage(p, store, uri.fragment)
										this.setState({ p, uri })
									} else {
										console.error(res.status, res.statusText, await res.text())
									}
								})
								.catch(err => console.error(err))
						}}
					/>
				</section>
				<Divider />
				<section>
					<h4 className={Classes.HEADING}>Contents</h4>
					{p.members.map(this.renderMember)}
				</section>
			</React.Fragment>
		)
	}

	renderLabel(label: string): JSX.Element {
		return <td className="label">{label}</td>
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

	renderMember(member: Member, key: number): JSX.Element {
		if (member.type === ResourceType.Package) {
			const { title, resource, value } = member
			const { p } = this.state
			const className = PackageView.testExternal(p.resource, resource, title)
				? "external subpackage"
				: "subpackage"
			const href = serializeURI({ ...gatewayURL, path: value.path })
			const props = { key, className, href }
			return <a {...props}>{title}</a>
		} else if (member.type === ResourceType.Message) {
		} else if (member.type === ResourceType.File) {
			const { title, resource, value } = member
			const href = serializeURI({ ...gatewayURL, path: value.path })
			const props = { key, href }
			return (
				<AnchorButton minimal={true} icon="document" key={key} href={href}>
					{title} - {member.extent} bytes - {member.format}
				</AnchorButton>
			)
		} else {
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
