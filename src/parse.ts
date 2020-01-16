import { Store, StreamParser } from "n3"
import { parse as parseURI } from "uri-js"

import { Schema } from "@shex/parser"
import {
	Util,
	Validator,
	Literal,
	TripleConstraintSolutions,
	TestedTriple,
	NodeConstraint,
	EachOfSolutions,
	ShapeTest,
	ShapeAndResults,
} from "@shex/core"

import {
	Package,
	Member,
	ResourceType,
	FileMember,
	MessageMember,
	PackageMember,
} from "./interfaces"
import { dcterms, prov, ldp } from "./vocab"

// Types for dayys
type UriOrLiteral = Literal | string
type LiteralExpression = TripleConstraintSolutions<
	TestedTriple<Literal, undefined>,
	undefined
>
type UriExpression = TripleConstraintSolutions<
	TestedTriple<string, undefined>,
	undefined
>
type UriOrLiteralExpession = TripleConstraintSolutions<
	TestedTriple<UriOrLiteral, undefined>,
	NodeConstraint
>
type LiteralOrEachOfSolutions = EachOfSolutions<
	LiteralExpression | EachOfSolutions<UriOrLiteralExpession>
>

export function parseDataset(quads: string): Promise<Store> {
	const store = new Store()
	const n3Parser = new StreamParser({
		format: "application/n-quads",
		blankNodePrefix: "_:",
	})

	return new Promise((resolve, reject) => {
		n3Parser.on("error", err => reject(err))
		n3Parser.on("data", quad => store.addQuad(quad))
		n3Parser.on("end", () => resolve(store))
		n3Parser.end(quads)
	})
}

export function validatePackage(
	schema: Schema,
	store: Store,
	fragment: string
): Package {
	const db = Util.makeN3DB(store)
	const validator = Validator.construct(schema)

	const result = validator.validate(db, fragment, schema.start)
	if (result.type === "ShapeAndResults") {
		const {
			solution: {
				solutions: [{ expressions }],
			},
		} = result.solutions.find(({ type }) => type === "ShapeTest") as ShapeTest<
			EachOfSolutions<
				TripleConstraintSolutions<TestedTriple<UriOrLiteral, undefined>, string>
			>
		>

		// Find the membership resource
		const {
			solutions: [{ object: resource }],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" &&
				predicate === ldp.membershipResource
		) as UriExpression

		// Get the title
		const {
			solutions: [
				{
					object: { value: title },
				},
			],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dcterms.title
		) as LiteralExpression

		// Get the description, if it exists
		const { solutions: descriptionSolution } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" &&
				predicate === dcterms.description
		) as LiteralExpression
		const description =
			descriptionSolution.length === 1
				? descriptionSolution[0].object.value
				: null

		// Get the keywords, if they exist
		const { solutions: subjectSolutions } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dcterms.subject
		) as LiteralExpression

		const keywords = subjectSolutions.map(({ object: { value } }) => value)

		// Get the created date
		const {
			solutions: [
				{
					object: { value: created },
				},
			],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dcterms.created
		) as LiteralExpression

		// Get the modified date
		const {
			solutions: [
				{
					object: { value: modified },
				},
			],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dcterms.modified
		) as LiteralExpression

		// Get the previous revision, if it exists
		const { solutions: revisionSolutions } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === prov.wasRevisionOf
		) as UriExpression
		const revisionOf =
			revisionSolutions.length === 1
				? parseURI(revisionSolutions[0].object)
				: null

		// Get the directory value
		const {
			solutions: [
				{
					object: value,
					referenced: { solutions: valueSolutions },
				},
			],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === prov.value
		) as TripleConstraintSolutions<
			TestedTriple<string, ShapeAndResults<LiteralExpression>>,
			undefined
		>
		const {
			solution: {
				solutions: [extentSolution],
			},
		} = valueSolutions.find(({ type }) => type === "ShapeTest") as ShapeTest<
			LiteralExpression
		>
		const {
			object: { value: extent },
		} = extentSolution

		const members: Member[] = []

		const { solutions: packageSolutions } = expressions.find(
			({ type, predicate, valueExpr }) =>
				type === "TripleConstraintSolutions" &&
				predicate === prov.hadMember &&
				valueExpr === "_:p"
		) as TripleConstraintSolutions<
			TestedTriple<
				string,
				ShapeAndResults<EachOfSolutions<UriOrLiteralExpession>>
			>,
			string
		>

		for (const {
			object,
			referenced: { solutions: packageResults },
		} of packageSolutions) {
			const {
				solution: {
					solutions: [{ expressions: packageExpressions }],
				},
			} = packageResults.find(({ type }) => type === "ShapeTest") as ShapeTest<
				EachOfSolutions<UriOrLiteralExpession>
			>
			const {
				solutions: [{ object: resource }],
			} = packageExpressions.find(
				({ predicate }) => predicate === ldp.membershipResource
			) as UriExpression

			const {
				solutions: [
					{
						object: { value: title },
					},
				],
			} = packageExpressions.find(
				({ predicate }) => predicate === dcterms.title
			) as LiteralExpression

			const member: PackageMember = {
				type: ResourceType.Package,
				value: parseURI(object),
				resource: parseURI(resource),
				title: title,
			}

			members.push(member)
		}

		const { solutions: messageSolutions } = expressions.find(
			({ type, predicate, valueExpr }) =>
				type === "TripleConstraintSolutions" &&
				predicate === prov.hadMember &&
				valueExpr === "_:m"
		) as TripleConstraintSolutions<
			TestedTriple<
				string,
				ShapeAndResults<EachOfSolutions<UriOrLiteralExpession>>
			>,
			string
		>

		for (const {
			object: value,
			referenced: { solutions },
		} of messageSolutions) {
			const member: MessageMember = {
				type: ResourceType.Message,
				value: parseURI(value),
				resource: null,
				title: null,
			}

			const {
				solution: {
					solutions: [{ expressions: resourceSolutions }],
				},
			} = solutions.find(({ type }) => type === "ShapeTest") as ShapeTest<
				EachOfSolutions<UriOrLiteralExpession>
			>

			const {
				solutions: [{ object: resource }],
			} = resourceSolutions.find(
				({ predicate }) => predicate === ldp.membershipResource
			) as UriExpression

			const {
				solutions: [
					{
						object: { value: title },
					},
				],
			} = resourceSolutions.find(
				({ predicate }) => predicate === dcterms.title
			) as LiteralExpression

			member.resource = parseURI(resource)
			member.title = title

			members.push(member)
		}

		const { solutions: fileSolutions } = expressions.find(
			({ type, predicate, valueExpr }) =>
				type === "TripleConstraintSolutions" &&
				predicate === prov.hadMember &&
				valueExpr === "_:f"
		) as TripleConstraintSolutions<
			TestedTriple<string, ShapeAndResults<LiteralOrEachOfSolutions>>,
			string
		>

		for (const {
			object: value,
			referenced: { solutions },
		} of fileSolutions) {
			const {
				solution: {
					solutions: [{ expressions }],
				},
			} = solutions.find(({ type }) => type === "ShapeTest") as ShapeTest<
				LiteralOrEachOfSolutions
			>

			// Get file extent
			const {
				solutions: [
					{
						object: { value: extent },
					},
				],
			} = expressions.find(node => {
				if (node.type === "TripleConstraintSolutions") {
					return node.predicate === dcterms.extent
				}
			}) as LiteralExpression

			// Get file format
			const {
				solutions: [
					{
						object: { value: format },
					},
				],
			} = expressions.find(node => {
				if (node.type === "TripleConstraintSolutions") {
					return node.predicate === dcterms.format
				}
			}) as LiteralExpression

			const member: FileMember = {
				type: ResourceType.File,
				value: parseURI(value),
				format,
				extent: parseInt(extent),
				resource: null,
				title: null,
			}

			// Get the file resource and title, if they exist
			const optionalExpression = expressions.find(
				({ type }) => type === "EachOfSolutions"
			) as EachOfSolutions<UriOrLiteralExpession>

			if (optionalExpression) {
				const {
					solutions: [{ expressions: optionalSolutions }],
				} = optionalExpression
				const {
					solutions: [{ object: resource }],
				} = optionalSolutions.find(
					({ predicate }) => predicate === ldp.membershipResource
				) as UriExpression
				const {
					solutions: [
						{
							object: { value: title },
						},
					],
				} = optionalSolutions.find(
					({ predicate }) => predicate === dcterms.title
				) as LiteralExpression

				member.resource = parseURI(resource)
				member.title = title
			}

			members.push(member)
		}

		return {
			resource: parseURI(resource),
			value: parseURI(value),
			extent: parseInt(extent),
			name: title,
			description,
			keywords,
			created: new Date(created),
			modified: new Date(modified),
			revisionOf,
			members: members,
		}
	} else {
		return null
	}
}
