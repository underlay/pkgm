declare module "n3" {
	export interface Node {}
	export interface Quad {}

	export class Store {
		addQuad(quad: Quad): void
		forSubjects(callback: (subject: Node) => void): void
	}

	export class StreamParser {
		constructor(props: { format: string; blankNodePrefix: string })
		on(event: "error", callback: (err: Error) => void): StreamParser
		on(event: "data", callback: (quad: Quad) => void): StreamParser
		on(event: "end", callback: () => void): StreamParser
		end(data: string): void
	}

	export var DataFactory: {
		internal: {
			toId(node: Node): string
		}
	}
}
