import * as N3 from "n3"
import { parse as parseURI } from "uri-js"

import * as ShExParser from "@shex/parser"
import * as ShExCore from "@shex/core"

import {
	Package,
	Member,
	ResourceType,
	FileMember,
	MessageMember,
	PackageMember,
} from "./package"

// Types for dayys
type LiteralExpression = ShExCore.TripleConstraintSolutions<
	ShExCore.TestedTriple<ShExCore.Literal, undefined>,
	undefined
>
type UriExpression = ShExCore.TripleConstraintSolutions<
	ShExCore.TestedTriple<string, undefined>,
	undefined
>
type UriOrLiteralExpession = ShExCore.TripleConstraintSolutions<
	ShExCore.TestedTriple<UriOrLiteral, undefined>,
	ShExCore.NodeConstraint
>
type UriOrLiteral = ShExCore.Literal | string
type PackageResult = ShExCore.ShapeTest<
	ShExCore.EachOfSolutions<
		ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<UriOrLiteral, undefined>,
			string
		>
	>
>
type ValueTypeR = ShExCore.ShapeAndResults<LiteralExpression>
type TripleOrEach = ShExCore.EachOfSolutions<
	LiteralExpression | ShExCore.EachOfSolutions<UriOrLiteralExpession>
>
type FileTypeR = ShExCore.ShapeAndResults<TripleOrEach>
type MessageTypeR = ShExCore.ShapeAndResults<
	ShExCore.EachOfSolutions<
		ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<ShExCore.Literal | string, undefined>,
			ShExCore.NodeConstraint
		>
	>
>

const membershipResource = "http://www.w3.org/ns/ldp#membershipResource"
const hadMember = "http://www.w3.org/ns/prov#hadMember"
const wasRevisionOf = "http://www.w3.org/ns/prov#wasRevisionOf"
const provValue = "http://www.w3.org/ns/prov#value"
const dctermsTitle = "http://purl.org/dc/terms/title"
const dctermsSubject = "http://purl.org/dc/terms/subject"
const dctermsDescription = "http://purl.org/dc/terms/description"
const dctermsFormat = "http://purl.org/dc/terms/format"
const dctermsExtent = "http://purl.org/dc/terms/extent"
const dctermsCreated = "http://purl.org/dc/terms/created"
const dctermsModified = "http://purl.org/dc/terms/modified"

export function parseDataset(quads: string): Promise<N3.Store> {
	const store = new N3.Store()
	const n3Parser = new N3.StreamParser({
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
	schema: ShExParser.Schema,
	store: N3.Store,
	fragment: string
): Package {
	const db = ShExCore.Util.makeN3DB(store)
	const validator = ShExCore.Validator.construct(schema)

	const result = validator.validate(db, fragment, schema.start)
	console.log(result)
	if (result.type === "ShapeAndResults") {
		const {
			solution: {
				solutions: [{ expressions }],
			},
		} = result.solutions.find(
			({ type }) => type === "ShapeTest"
		) as PackageResult

		// Find the membership resource
		const {
			solutions: [{ object: resource }],
		} = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === membershipResource
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
				type === "TripleConstraintSolutions" && predicate === dctermsTitle
		) as LiteralExpression

		// Get the description, if it exists
		const { solutions: descriptionSolution } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dctermsDescription
		) as LiteralExpression
		const description =
			descriptionSolution.length === 1
				? descriptionSolution[0].object.value
				: null

		// Get the keywords, if they exist
		const { solutions: subjectSolutions } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === dctermsSubject
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
				type === "TripleConstraintSolutions" && predicate === dctermsCreated
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
				type === "TripleConstraintSolutions" && predicate === dctermsModified
		) as LiteralExpression

		// Get the previous revision, if it exists
		const { solutions: revisionSolutions } = expressions.find(
			({ type, predicate }) =>
				type === "TripleConstraintSolutions" && predicate === wasRevisionOf
		) as UriExpression
		const revisionOf =
			revisionSolutions.length === 1
				? parseURI(revisionSolutions[1].object)
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
				type === "TripleConstraintSolutions" && predicate === provValue
		) as ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<string, ValueTypeR>,
			undefined
		>
		const {
			solution: {
				solutions: [extentSolution],
			},
		} = valueSolutions.find(
			({ type }) => type === "ShapeTest"
		) as ShExCore.ShapeTest<LiteralExpression>
		const {
			object: { value: extent },
		} = extentSolution

		const members: Member[] = []

		const { solutions: packageSolutions } = expressions.find(
			({ type, predicate, valueExpr }) =>
				type === "TripleConstraintSolutions" &&
				predicate === hadMember &&
				valueExpr === "_:p"
		) as ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<
				string,
				ShExCore.ShapeAndResults<
					ShExCore.EachOfSolutions<UriOrLiteralExpession>
				>
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
			} = packageResults.find(
				({ type }) => type === "ShapeTest"
			) as ShExCore.ShapeTest<ShExCore.EachOfSolutions<UriOrLiteralExpession>>
			const {
				solutions: [{ object: resource }],
			} = packageExpressions.find(
				({ predicate }) => predicate === membershipResource
			) as UriExpression

			const {
				solutions: [
					{
						object: { value: title },
					},
				],
			} = packageExpressions.find(
				({ predicate }) => predicate === membershipResource
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
				predicate === hadMember &&
				valueExpr === "_:m"
		) as ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<string, MessageTypeR>,
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
			} = solutions.find(
				({ type }) => type === "ShapeTest"
			) as ShExCore.ShapeTest<ShExCore.EachOfSolutions<UriOrLiteralExpession>>

			const {
				solutions: [{ object: resource }],
			} = resourceSolutions.find(
				({ predicate }) => predicate === membershipResource
			) as UriExpression

			const {
				solutions: [
					{
						object: { value: title },
					},
				],
			} = resourceSolutions.find(
				({ predicate }) => predicate === dctermsTitle
			) as LiteralExpression

			member.resource = parseURI(resource)
			member.title = title

			members.push(member)
		}

		const { solutions: fileSolutions } = expressions.find(
			({ type, predicate, valueExpr }) =>
				type === "TripleConstraintSolutions" &&
				predicate === hadMember &&
				valueExpr === "_:f"
		) as ShExCore.TripleConstraintSolutions<
			ShExCore.TestedTriple<string, FileTypeR>,
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
			} = solutions.find(
				({ type }) => type === "ShapeTest"
			) as ShExCore.ShapeTest<TripleOrEach>

			// Get file extent
			const {
				solutions: [
					{
						object: { value: extent },
					},
				],
			} = expressions.find(node => {
				if (node.type === "TripleConstraintSolutions") {
					return node.predicate === dctermsExtent
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
					return node.predicate === dctermsFormat
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
			) as ShExCore.EachOfSolutions<UriOrLiteralExpession>

			if (optionalExpression) {
				const {
					solutions: [{ expressions: optionalSolutions }],
				} = optionalExpression
				const {
					solutions: [{ object: resource }],
				} = optionalSolutions.find(
					({ predicate }) => predicate === membershipResource
				) as UriExpression
				const {
					solutions: [
						{
							object: { value: title },
						},
					],
				} = optionalSolutions.find(
					({ predicate }) => predicate === dctermsTitle
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
	}
}
