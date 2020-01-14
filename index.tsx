import * as React from "react"
import * as ReactDOM from "react-dom"
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
	}

	render() {
		const { path } = this.state
		const url = origin + path
		return <PackageView url={url} />
	}
}

ReactDOM.render(<Index />, main)
