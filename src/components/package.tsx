import * as React from "react"
import {
	Classes,
	Button,
	HTMLTable,
	InputGroup,
	AnchorButton,
	Divider,
	FileInput,
	IButtonProps,
	Breadcrumbs,
	IBreadcrumbProps,
} from "@blueprintjs/core"

import { URIComponents } from "uri-js"

import { ResourceType, Package, Member } from "../interfaces"
import URIView from "./uri"
import { parseDataset, validatePackage } from "../parse"
import {
	parseVersionURI,
	patchPackage,
	pathSegment,
	makeExploreURL,
	makeGatewayURL,
	PackageSchema,
} from "../utils"

import { dcterms, ldp } from "../vocab"
import MemberView from "./member"
import EditDescription from "./description"

const resourceTypeMap: { [index: string]: ResourceType } = {
	[ldp.directContainer]: ResourceType.Package,
	[ldp.rdfSource]: ResourceType.Message,
	[ldp.nonRDFSource]: ResourceType.File,
}

interface PackageProps {
	origin: string
	path: string
	onChange: (path: string) => void
}

interface PackageState {
	editDescription: boolean
	editDescriptionPending: boolean
	p: Package
	uri: URIComponents
	path: string
	error: any
}

export class PackageView extends React.Component<PackageProps, PackageState> {
	static testExternal(
		a: URIComponents,
		b: URIComponents,
		name: string
	): boolean {
		return a.host === b.host && a.path === b.path + "/" + name
	}

	static getDerivedStateFromProps(
		props: PackageProps,
		state: PackageState
	): Partial<PackageState> {
		if (state.path !== props.path) {
			return { path: null, uri: null, p: null }
		} else {
			return null
		}
	}

	constructor(props: PackageProps) {
		super(props)
		this.state = {
			editDescription: false,
			editDescriptionPending: false,
			p: null,
			uri: null,
			path: props.path,
			error: null,
		}
	}

	componentDidMount() {
		this.fetchPackage()
	}

	componentDidUpdate(prevProps: PackageProps, prevState: PackageState) {
		if (prevProps.path !== this.props.path) {
			this.fetchPackage()
		}
	}

	fetchPackage() {
		const { origin, path } = this.props
		const url = origin + path
		fetch(url, {
			method: "GET",
			headers: { Accept: "application/n-quads" },
		})
			.then(async res => {
				const uri = parseVersionURI(res.headers)
				if (uri !== null) {
					const store = await res.text().then(parseDataset)
					const p = validatePackage(await PackageSchema, store, uri.fragment)
					this.setState({ path, p, uri })
				}
			})
			.catch(err => this.setState({ error: err }))
	}

	handleNewPackage = async (slug: string) => {
		const path =
			this.props.path === "/" ? `/${slug}` : `${this.props.path}/${slug}`
		const url = this.props.origin + path
		const res = await fetch(url, { method: "MKCOL" })
		if (res.status === 201) {
			this.props.onChange(path)
		} else {
			console.error(res.status, res.statusText, await res.text())
		}
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
		const url = this.props.origin + this.props.path
		const res = await fetch(url, {
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

	handleFile = (event: React.FormEvent<HTMLInputElement>) => {
		const { files } = event.target as HTMLInputElement
		const formData = new FormData()
		for (const file of files) {
			formData.append(file.name, file, file.name)
		}
		const url = this.props.origin + this.props.path
		fetch(url, {
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
	}

	render() {
		const { path, p, uri, error } = this.state
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

		const exploreURL = makeExploreURL(uri.path, uri.fragment)
		const gatewayURL = makeGatewayURL(p.value.path)
		const revisionOfURL =
			p.revisionOf && makeExploreURL(p.revisionOf.path, p.revisionOf.fragment)

		const anchorProps: IButtonProps = {
			minimal: true,
			small: true,
			rightIcon: "share",
		}

		const terms = path === "/" ? [""] : path.split("/")
		const items: IBreadcrumbProps[] = terms.map((text, index) => {
			const path = terms.slice(0, index + 1).join("/")
			const onClick = () => this.props.onChange(path)
			if (text === "") {
				return { onClick, icon: "archive" }
			} else {
				return { onClick, text }
			}
		})

		return (
			<React.Fragment>
				<header>
					<Breadcrumbs items={items} />
					<URIView uri={p.resource} />
				</header>
				<HTMLTable striped={true} condensed={true}>
					<tbody>
						<tr>
							{this.renderLabel("version")}
							<td>
								<URIView uri={uri} />
								<AnchorButton {...anchorProps} href={exploreURL}>
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
									<AnchorButton {...anchorProps} href={gatewayURL}>
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
						{p.revisionOf && (
							<tr>
								{this.renderLabel("revision of")}
								<td colSpan={3}>
									<URIView uri={p.revisionOf} />
									<AnchorButton href={revisionOfURL} {...anchorProps}>
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
					<NewPackage p={p} onSubmit={this.handleNewPackage} />
					<div style={{ margin: "1em 0" }}>
						<FileInput
							inputProps={{ multiple: true }}
							text="Upload files..."
							buttonText="Browse"
							onInputChange={this.handleFile}
						/>
					</div>
				</section>
				<Divider />
				<section>
					<h4 className={Classes.HEADING}>Contents</h4>
					{this.renderMembers()}
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

	renderMembers() {
		if (this.state.p.members.length > 0) {
			return this.state.p.members.map(this.renderMember)
		} else {
			return <i>Package is empty</i>
		}
	}

	renderMember = (member: Member, key: number) => (
		<MemberView
			key={key}
			member={member}
			path={this.props.path}
			onClick={this.props.onChange}
		/>
	)
}

interface NewPackageProps {
	p: Package
	onSubmit: (value: string) => void
}

class NewPackage extends React.Component<
	NewPackageProps,
	{ value: string; disabled: boolean }
> {
	constructor(props: NewPackageProps) {
		super(props)
		this.state = { value: "", disabled: true }
	}

	handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = event.target
		const disabled =
			value === "" ||
			!pathSegment.test(value) ||
			this.props.p.members.find(({ title }) => title === value) !== undefined
		this.setState({ value, disabled })
	}

	handleSubmit = () => this.props.onSubmit(this.state.value)

	render() {
		return (
			<InputGroup
				className="new-package"
				intent="none"
				value={this.state.value}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
				placeholder="New package name..."
				rightElement={
					<Button
						text="Create"
						disabled={this.state.disabled}
						onClick={this.handleSubmit}
					/>
				}
			/>
		)
	}
}
