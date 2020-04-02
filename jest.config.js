// We need to keep this until we make the EXPLORER flag obsolete (by enabling
// the explorer on the live site)
process.env.EXPLORER = true

// For now:
// - server tests go in the test/ dir and are run in the node environment
// - client tests go in __tests__ files anywhere else, and are run in the jsdom environment
//
// This may not be ideal long-term, but we need a simple pattern-matching way to distinguish
// between client and server tests. -@jasoncrawford 2019-12-03

const common = {
    preset: "ts-jest",
    moduleNameMapper: {
        "^(admin|site|charts|utils|db|settings|test)/(.*)$": "<rootDir>/$1/$2",
        "^settings$": "<rootDir>/settings",
        "^serverSettings$": "<rootDir>/serverSettings",
        // Jest cannot handle importing CSS
        // https://stackoverflow.com/questions/39418555/syntaxerror-with-jest-and-react-and-importing-css-files
        "\\.(css|less|sass|scss)$": "<rootDir>/test/styleMock.ts"
        // this is not beautiful, but is the simplest solution to make jest run with the ES6-module-exporting lodash-es
        // suggested here: https://stackoverflow.com/a/54117206/10670163
        // other solutions would involve running babel on lodash-es to transform it to commonjs
    }
}

module.exports = {
    projects: [
        {
            ...common,
            displayName: "server",
            testEnvironment: "node",
            testMatch: ["<rootDir>/test/**/?(*.)+(spec|test).[jt]s?(x)"]
        },
        {
            ...common,
            displayName: "client",
            testEnvironment: "jsdom",
            setupFilesAfterEnv: ["<rootDir>/test/enzymeSetup.ts"],
            testMatch: ["**/__tests__/**/*.[jt]s?(x)"]
        }
    ]
}
