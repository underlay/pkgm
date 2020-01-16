import * as React from "react"
import * as ReactDOM from "react-dom"
import { PackageView } from "./src/components/package"
import { uriPath } from "./src/utils"

const main = document.querySelector("main")

const origin = "http://localhost:8086"

class Index extends React.Component<{}, { path: string }> {
	static parsePath(): string {
		const hash = window.location.search.slice(1)
		return uriPath.test(hash) ? hash : "/"
	}

	constructor(props: {}) {
		super(props)
		const path = Index.parsePath()
		this.state = { path }
		history.replaceState({ path }, path, `?${path}`)
	}

	componentDidMount() {
		window.addEventListener("popstate", ({ state }) => this.setState(state))
	}

	handleChange = (path: string) => {
		history.pushState({ path }, path, `?${path}`)
		this.setState({ path })
	}

	render() {
		return (
			<PackageView
				origin={origin}
				path={this.state.path}
				onChange={this.handleChange}
			/>
		)
	}
}

ReactDOM.render(<Index />, main)
