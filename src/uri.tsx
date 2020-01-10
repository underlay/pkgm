import * as React from "react"
import { URIComponents, serialize } from "uri-js"

export default class URIView extends React.Component<{ uri: URIComponents }> {
	render() {
		return <pre className="uri">{serialize(this.props.uri)}</pre>
	}
}
