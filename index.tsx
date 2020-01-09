import * as React from "react"
import * as ReactDOM from "react-dom"
import { parseDataset, validatePackage } from "./src/parse"
import { PackageSchema, Package } from "./src/package"
import { PackageView } from "./src"

const main = document.querySelector("main")

interface IndexState {
	path: string
	p: Package
}

class Index extends React.Component<{}, IndexState> {
	constructor(props: {}) {
		super(props)
		this.state = { path: "/", p: null }
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
		const store = await res.text().then(parseDataset)
		const packages = validatePackage(await PackageSchema, store)
		if (packages.has("_:c14n0")) {
			const p = packages.get("_:c14n0")
			console.log(p)
			this.setState({ p })
		}
	}

	render() {
		const { path, p } = this.state
		if (p !== null) {
			return <PackageView p={p} />
		} else {
			return <p>Loading...</p>
		}
	}
}

ReactDOM.render(<Index />, main)
