export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
	testPathIgnorePatterns: ["/node_modules/", "/__tests__/mocks/"],
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				useESM: true,
				tsconfig: {
					module: "NodeNext",
					moduleResolution: "NodeNext",
					allowSyntheticDefaultImports: true,
					esModuleInterop: true,
				},
			},
		],
	},
	moduleNameMapper: {
		"^@/(.*)\\.(j|t)s$": "<rootDir>/src/$1",
		"^@analyzers/(.*)\\.(j|t)s$": "<rootDir>/src/analyzers/$1",
		"^@services/(.*)\\.(j|t)s$": "<rootDir>/src/services/$1",
		"^@utils/(.*)\\.(j|t)s$": "<rootDir>/src/utils/$1",
		"^@models/(.*)\\.(j|t)s$": "<rootDir>/src/models/$1",
		"^@errors/(.*)\\.(j|t)s$": "<rootDir>/src/errors/$1",
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@analyzers/(.*)$": "<rootDir>/src/analyzers/$1",
		"^@services/(.*)$": "<rootDir>/src/services/$1",
		"^@utils/(.*)$": "<rootDir>/src/utils/$1",
		"^@models/(.*)$": "<rootDir>/src/models/$1",
		"^@errors/(.*)$": "<rootDir>/src/errors/$1",
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	extensionsToTreatAsEsm: [".ts"],
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.d.ts",
		"!src/**/__tests__/**",
	],
	transformIgnorePatterns: ["node_modules/(?!(@google/generative-ai)/)"],
};
