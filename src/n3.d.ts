declare module "n3" {
	interface Term {
		termType: string
		value: string
		equals(term?: Term): boolean
	}

	interface NamedNode extends Term {
		termType: "NamedNode"
	}

	interface BlankNode extends Term {
		termType: "BlankNode"
	}

	interface Literal extends Term {
		termType: "Literal"
		datatype: NamedNode
		language: string
	}

	interface Variable extends Term {
		termType: "Variable"
	}

	interface DefaultGraph extends Term {
		termType: "DefaultGraph"
	}

	type Node = NamedNode | BlankNode | Literal | Variable

	interface Quad {
		subject: Term
		predicate: Term
		object: Term
		graph: Term
		equals(quad?: Quad): boolean
	}

	export class Store {
		addQuad(quad: Quad): void
		forSubjects(callback: (subject: Node) => void): void
		forEach(
			callback: (quad: Quad) => void,
			subject?: Node,
			predicate?: Node,
			object?: Node,
			graph?: Node
		): void

		some(
			callback: (quad: Quad) => void,
			subject?: Node,
			predicate?: Node,
			object?: Node,
			graph?: Node
		): boolean

		countQuads(
			subject?: Node,
			predicate?: Node,
			object?: Node,
			graph?: Node
		): number

		getQuads(
			subject?: Node,
			predicate?: Node,
			object?: Node,
			graph?: Node
		): Quad[]
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
		namedNode: (value: string) => NamedNode
		blankNode: (value?: string) => BlankNode
		literal: (value: string, languageOrDatatype?: string | NamedNode) => Literal
		variable: (value: string) => BlankNode
		defaultGraph: () => DefaultGraph
		quad: (subject: Node, predicate: Node, object: Node, graph?: Node) => Quad
		fromTerm: (original: Term) => Term
		fromQuad: (original: Quad) => Quad
	}
}

// interface DataFactory {
//   Variable variable(string value);
//   DefaultGraph defaultGraph();
//   Quad quad(Term subject, Term predicate, Term object, optional Term? graph);
//   Term fromTerm(Term original);
//   Quad fromQuad(Quad original);
// };
