import * as N3 from "n3"
import { parse as parseURI } from "uri-js"

import * as ShExParser from "@shex/parser"
import * as ShExCore from "@shex/core"

import { Package, Member, ResourceType } from "./package"

// Types for dayys
type LiteralExpression = ShExCore.Expression<ShExCore.Literal, undefined>
type UriExpression = ShExCore.Expression<string, undefined>
type UriOrLiteral = ShExCore.Literal | string
type EachOf = ShExCore.EachOfSolutions<UriOrLiteral, undefined>
type PackageResult = ShExCore.ShapeTest<
	ShExCore.EachOfSolutions<
		UriOrLiteral,
		ShExCore.Expression<UriOrLiteral, undefined> | EachOf
	>
>

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
	store: N3.Store
): Map<string, Package> {
	const db = ShExCore.Util.makeN3DB(store)
	const validator = ShExCore.Validator.construct(schema)

	const packages: Map<string, Package> = new Map()
	store.forSubjects(subject => {
		const id = N3.DataFactory.internal.toId(subject)
		const result = validator.validate(db, id, schema.start)
		if (result.type === "ShapeAndResults") {
			const {
				node: focus,
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
					type === "TripleConstraintSolutions" &&
					predicate === "http://www.w3.org/ns/ldp#membershipResource"
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
					type === "TripleConstraintSolutions" &&
					predicate === "http://purl.org/dc/terms/title"
			) as LiteralExpression

			// Get the description, if it exists
			const { solutions: descriptionSolution } = expressions.find(
				({ type, predicate }) =>
					type === "TripleConstraintSolutions" &&
					predicate === "http://purl.org/dc/terms/description"
			) as LiteralExpression
			const description =
				descriptionSolution.length === 1
					? descriptionSolution[0].object.value
					: null

			// Get the keywords, if they exist
			const { solutions: subjectSolutions } = expressions.find(
				({ type, predicate }) =>
					type === "TripleConstraintSolutions" &&
					predicate === "http://purl.org/dc/terms/subject"
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
					type === "TripleConstraintSolutions" &&
					predicate === "http://purl.org/dc/terms/created"
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
					type === "TripleConstraintSolutions" &&
					predicate === "http://purl.org/dc/terms/modified"
			) as LiteralExpression

			// Get the previous revision, if it exists
			const { solutions: revisionSolutions } = expressions.find(
				({ type, predicate }) =>
					type === "TripleConstraintSolutions" &&
					predicate === "http://www.w3.org/ns/prov#wasRevisionOf"
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
					type === "TripleConstraintSolutions" &&
					predicate === "http://www.w3.org/ns/prov#value"
			) as ShExCore.Expression<string, LiteralExpression>
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
					predicate === "http://www.w3.org/ns/prov#hadMember" &&
					valueExpr === "_:p"
			) as ShExCore.Expression<string, UriExpression>

			for (const {
				object: value,
				referenced: { solutions },
			} of packageSolutions) {
				const {
					solution: {
						solutions: [{ object: resource }],
					},
				} = solutions.find(
					({ type }) => type === "ShapeTest"
				) as ShExCore.ShapeTest<UriExpression>

				members.push({
					type: ResourceType.Package,
					value: parseURI(value),
					resource: parseURI(resource),
				})
			}

			const { solutions: messageSolutions } = expressions.find(
				({ type, predicate, valueExpr }) =>
					type === "TripleConstraintSolutions" &&
					predicate === "http://www.w3.org/ns/prov#hadMember" &&
					valueExpr === "_:m"
			) as ShExCore.Expression<string, UriExpression>

			for (const {
				object: value,
				referenced: { solutions },
			} of messageSolutions) {
				const {
					solution: { solutions: resourceSolutions },
				} = solutions.find(
					({ type }) => type === "ShapeTest"
				) as ShExCore.ShapeTest<UriExpression>

				members.push({
					type: ResourceType.Message,
					value: parseURI(value),
					resource:
						resourceSolutions.length === 1
							? parseURI(resourceSolutions[1].object)
							: null,
				})
			}

			const { solutions: fileSolutions } = expressions.find(
				({ type, predicate, valueExpr }) =>
					type === "TripleConstraintSolutions" &&
					predicate === "http://www.w3.org/ns/prov#hadMember" &&
					valueExpr === "_:f"
			) as ShExCore.Expression<string, EachOf>

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
				) as ShExCore.ShapeTest<EachOf>

				// Get file extent
				const {
					solutions: [
						{
							object: { value: extent },
						},
					],
				} = expressions.find(
					({ type, predicate }) =>
						type === "TripleConstraintSolutions" &&
						predicate === "http://purl.org/dc/terms/extent"
				) as LiteralExpression

				// Get file format
				const {
					solutions: [
						{
							object: { value: format },
						},
					],
				} = expressions.find(
					({ type, predicate }) =>
						type === "TripleConstraintSolutions" &&
						predicate === "http://purl.org/dc/terms/format"
				) as LiteralExpression

				// Get the file resource, if it exists
				const { solutions: resourceSolutions } = expressions.find(
					({ type, predicate }) =>
						type === "TripleConstraintSolutions" &&
						predicate === "http://www.w3.org/ns/ldp#membershipResource"
				) as UriExpression

				// TODO: Get the file name, if it exists
				members.push({
					type: ResourceType.File,
					value: parseURI(value),
					format,
					extent: parseInt(extent),
					resource:
						resourceSolutions.length === 1
							? parseURI(resourceSolutions[0].object)
							: null,
				})
			}

			console.log("resource, value", resource, value)
			packages.set(focus, {
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
			})
		}
	})

	return packages
}
