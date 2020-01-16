import * as React from "react"
import { URIComponents, serialize as serializeURI } from "uri-js"

export default function URIView({ uri }: { uri: URIComponents }): JSX.Element {
	return <pre className="uri">{serializeURI(uri)}</pre>
}
