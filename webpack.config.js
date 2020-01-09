module.exports = {
	// Enable sourcemaps for debugging webpack's output.
	devtool: "source-map",

	entry: __dirname + "/index.tsx",

	output: {
		filename: "index.min.js",
		path: __dirname + "/lib",
	},

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: [".js", ".ts", ".tsx"],
	},

	node: {
		fs: "empty",
	},

	module: {
		rules: [
			{
				test: /\.(shex)$/,
				exclude: /shex\.js/,
				options: {
					publicPath: "lib",
				},
				loader: "file-loader",
				// use: [{ loader: "file-loader" }],
			},
			{
				test: /\.ts(x?)$/,
				exclude: /node_modules/,
				use: [{ loader: "ts-loader" }],
			},
			// All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader",
			},
		],
	},

	// When importing a module whose path matches one of the following, just
	// assume a corresponding global variable exists and use that instead.
	// This is important because it allows us to avoid bundling all of our
	// dependencies, which allows browsers to cache those libraries between builds.
	externals: {
		react: "React",
		"react-dom": "ReactDOM",
	},
}