import algoliasearch from "algoliasearch"

import { countries, Country } from "utils/countries"

import { ALGOLIA_ID, ALGOLIA_SEARCH_KEY } from "settings"

let algolia: algoliasearch.Client | undefined

function getClient() {
    if (!algolia) algolia = algoliasearch(ALGOLIA_ID, ALGOLIA_SEARCH_KEY)
    return algolia
}

export type PageHit = ArticleHit | CountryHit

export interface CountryHit {
    objectID: string
    type: "country"
    slug: string
    title: string
    code: string
    content: string
    _highlightResult: any
    _snippetResult: {
        content: {
            value: string
        }
    }
}

export interface ArticleHit {
    objectID: string
    postId: number
    slug: string
    title: string
    type: "post" | "page" | "entry" | "explainer" | "fact"
    content: string
    _snippetResult: {
        content: {
            value: string
        }
    }
}

export interface ChartHit {
    chartId: number
    slug: string
    title: string
    subtitle: string
    variantName: string
    _snippetResult?: {
        subtitle: {
            value: string
        }
    }
    _highlightResult?: {
        availableEntities: {
            value: string
            matchLevel: "none" | "full"
            matchedWords: string[]
        }[]
    }
}

export interface SiteSearchResults {
    pages: PageHit[]
    charts: ChartHit[]
    countries: Country[]
}

export async function siteSearch(query: string): Promise<SiteSearchResults> {
    // Some special ad hoc handling of country names for chart query
    // This is especially important for "uk" and "us" since algolia otherwise isn't too sure what to do with them
    let chartQuery = query.trim()
    const matchCountries = []
    for (const country of countries) {
        let variants = [country.name]
        if (country.variantNames) {
            variants = variants.concat(country.variantNames)
        }
        for (const variant of variants) {
            const r = new RegExp(`(^|\\W)(${variant})($|\\W)`, "gi")

            const newQuery = chartQuery.replace(r, (substring, ...args) => {
                return args[0] + args[2]
            })

            if (newQuery !== chartQuery) {
                matchCountries.push(country)
                if (newQuery.trim().length) {
                    chartQuery = newQuery
                }
            }
        }
    }

    const json = await getClient().search([
        {
            indexName: "pages",
            query: query,
            params: {
                attributesToRetrieve: [
                    "objectID",
                    "postId",
                    "slug",
                    "title",
                    "type",
                    "code",
                    "content"
                ],
                attributesToSnippet: ["content:24"],
                distinct: true,
                hitsPerPage: 10
            }
        },
        {
            indexName: "charts",
            query: chartQuery,
            params: {
                attributesToRetrieve: [
                    "chartId",
                    "slug",
                    "title",
                    "variantName"
                ],
                attributesToSnippet: ["subtitle:24"],
                attributesToHighlight: ["availableEntities"],
                hitsPerPage: 10,
                removeStopWords: true,
                replaceSynonymsInHighlight: false
            }
        }
    ])

    return {
        pages: json.results[0].hits,
        charts: json.results[1].hits,
        countries: matchCountries
    }
}
