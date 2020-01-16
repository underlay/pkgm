import * as React from "react"
import { Member, ResourceType } from "../interfaces"
import { AnchorButton, Button } from "@blueprintjs/core"
import { makeGatewayURL } from "../utils"

export default class MemberView extends React.Component<{
	path: string
	member: Member
	onClick: (path: string) => void
}> {
	render() {
		const { member } = this.props
		if (member.type === ResourceType.Package) {
			const { title, resource, value } = member
			// const className = PackageView.testExternal(p.resource, resource, title)
			// 	? "external subpackage"
			// 	: "subpackage"
			// const href = serializeURI({ ...gatewayURL, path: value.path })
			console.log(member)
			const path =
				this.props.path === "/" ? `/${title}` : `${this.props.path}/${title}`
			return (
				<div className="member">
					<Button
						minimal={true}
						icon="archive"
						onClick={() => this.props.onClick(path)}
					>
						{title}
					</Button>
				</div>
			)
		} else if (member.type === ResourceType.Message) {
		} else if (member.type === ResourceType.File) {
			const { title, resource, value } = member
			const name = title === null ? value.path : title
			const href = makeGatewayURL(value.path)
			return (
				<div className="member">
					<AnchorButton minimal={true} icon="document" href={href}>
						{name} - {member.extent} bytes - {member.format}
					</AnchorButton>
				</div>
			)
		} else {
			return null
		}
	}
}
