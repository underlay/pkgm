import * as React from "react"
import * as ReactDOM from "react-dom"
import { parseDataset, validatePackage } from "./src/parse"
import { PackageSchema, Package } from "./src/package"
import { PackageView } from "./src"

const main = document.querySelector("main")

interface IndexState {
	path: string
}

const origin = "http://localhost:8086"

class Index extends React.Component<{}, IndexState> {
	constructor(props: {}) {
		super(props)
		this.state = { path: "/" }
	}

	async componentDidMount() {
		addEventListener("hashchange", () => {})
		const url = origin + this.state.path
	}

	render() {
		const { path } = this.state
		const url = origin + path
		return (
			<section className="package">
				<PackageView url={url} />
			</section>
		)
	}
}

ReactDOM.render(<Index />, main)
