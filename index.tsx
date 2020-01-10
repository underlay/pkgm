import * as React from "react"
import * as ReactDOM from "react-dom"
import { parseDataset, validatePackage } from "./src/parse"
import { PackageSchema, Package } from "./src/package"
import { PackageView, parseLinkHeader } from "./src"
import { URIComponents, parse as parseURI } from "uri-js"

const main = document.querySelector("main")

interface IndexState {
	path: string
	p: Package
	uri: URIComponents
}

const etag = /^\"([a-z1-7]{59})\"$/
const scheme = "u"

class Index extends React.Component<{}, IndexState> {
	constructor(props: {}) {
		super(props)
		this.state = { path: "/", p: null, uri: null }
	}

	async componentDidMount() {
		addEventListener("hashchange", () => {})
		const res = await fetch("http://localhost:8086/", {
			method: "GET",
			headers: {
				Accept: "application/n-quads",
			},
		})
		console.log(res.headers)

		const match = etag.exec(res.headers.get("ETag"))
		const links = parseLinkHeader(res.headers.get("Link"))
		if (match !== null && links.has("self")) {
			const [{ fragment }] = links.get("self")
			const uri: URIComponents = { scheme, path: match[1], fragment }
			const store = await res.text().then(text => {
				console.log(text)
				return parseDataset(text)
			})
			const p = validatePackage(await PackageSchema, store, fragment)
			console.log(p)
			this.setState({ p, uri })
		}
	}

	render() {
		const { path, p, uri } = this.state
		return (
			<section className="package">
				{p !== null ? <PackageView p={p} uri={uri} /> : <p>Loading...</p>}
			</section>
		)
	}
}

ReactDOM.render(<Index />, main)
