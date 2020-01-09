/// <reference path="n3.d.ts" />

declare module "*.shex"

declare module "@shex/parser" {
	interface Schema {
		start: string
	}

	function construct(): Parser

	class Parser {
		parse(shex: string): Schema
	}
}

declare module "@shex/core" {
	import * as N3 from "n3"

	var Util: {
		makeN3DB(store: N3.Store): DB
	}

	class Validator {
		static construct(schema: Schema): Validator
		validate(db: DB, id: string, start: string): ValidationResult
	}

	interface DB {}
	interface Schema {}
	interface ValidationResultBase {
		type: string
	}

	type ValidationResult = ShapeAndResults<undefined> | FailureResult
	interface FailureResult {
		type: "ShapeAndFailure"
		errors: {}[]
	}

	interface ShapeAndResults<T> {
		type: "ShapeAndResults"
		solutions: (ShapeTest<T> | NodeTest)[]
	}

	interface ShapeTest<T> {
		type: "ShapeTest"
		node: string
		shape: string
		solution: T
	}

	interface EachOfSolutions<T, R> {
		type: "EachOfSolutions"
		solutions: {
			type: "EachOfSolution"
			expressions: Expression<T, R>[]
		}[]
	}

	interface Expression<T, R> {
		type: string
		predicate: string
		solutions: Solution<T, R>[]
		valueExpr?: string
	}

	interface Literal {
		value: string
		type: string
	}

	interface Solution<T, R> {
		subject: string
		predicate: string
		object: T
		referenced?: ShapeAndResults<R>
	}

	interface NodeTest {
		type: "NodeTest"
		node: string
		shape: string
	}
}
