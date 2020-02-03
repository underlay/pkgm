import * as React from "react"
import { Member, ResourceType } from "../interfaces"
import {
	AnchorButton,
	Button,
	IconName,
	IButtonProps,
	Icon,
} from "@blueprintjs/core"
import { makeGatewayURL, makeExploreURL } from "../utils"
import URIView from "./uri"

interface MemberProps {
	path: string
	member: Member
	onClick(path: string): void
}

export const icons: Map<ResourceType, IconName> = new Map([
	[ResourceType.Package, "box"],
	[ResourceType.Message, "database"],
	[ResourceType.File, "document"],
])

export default function({ path, member, onClick }: MemberProps): JSX.Element {
	const icon = icons.get(member.type)
	const { title, value } = member
	const name = title === null ? value.path : title
	const props: IButtonProps = { small: true, minimal: true, icon }
	if (member.type === ResourceType.Package) {
		const link = path === "/" ? `/${title}` : `${path}/${title}`
		return (
			<div className="member">
				<Button
					small={true}
					minimal={true}
					icon={icon}
					onClick={() => onClick(link)}
				>
					{name}
				</Button>
				<div className="links">
					<URIView uri={member.value} />
					<URIView uri={member.resource} />
				</div>
			</div>
		)
	} else if (member.type === ResourceType.Message) {
		const href = makeExploreURL(value.path, value.fragment)
		return (
			<div className="member">
				<AnchorButton
					small={true}
					minimal={true}
					href={href}
					rightIcon="share"
					icon={icon}
				>
					{name}
				</AnchorButton>
				<div className="links">
					<URIView uri={member.value} />
					<URIView uri={member.resource} />
				</div>
			</div>
		)
	} else if (member.type === ResourceType.File) {
		const href = makeGatewayURL(value.path)
		return (
			<div className="member">
				<div className="file">
					<AnchorButton
						small={true}
						minimal={true}
						href={href}
						rightIcon="share"
						icon={icon}
					>
						{name}
					</AnchorButton>
					<span style={{ flex: 1 }} />
					<span style={{ padding: "0 10px" }}>{member.format}</span>
					<span>|</span>
					<span style={{ padding: "0 10px" }}>{member.extent} bytes</span>
				</div>
				<div className="links">
					<URIView uri={member.value} />
					{member.resource && <URIView uri={member.resource} />}
				</div>
			</div>
		)
	} else {
		return null
	}
}
