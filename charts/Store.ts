import { Indicator } from "./Indicator"
import { observable, runInAction } from "mobx"
import { fetchJSON, difference, values } from "./Util"
import { BAKED_BASE_URL } from "settings"

export class StoreEntry<EntityType> {
    @observable.ref isLoading: boolean = false
    @observable.ref lastRetrieved?: Date = undefined
    @observable.ref error?: Error = undefined
    @observable.ref entity?: EntityType

    constructor(entity?: EntityType) {
        if (entity) this.entity = entity
    }
}

export interface StoreEntries<EntityType> {
    [id: number]: StoreEntry<EntityType>
}

export class IndicatorStore {
    private indicatorsById: StoreEntries<Indicator> = {}
    private fetchAllPromise?: Promise<Indicator[]>

    private async fetchAll(): Promise<Indicator[]> {
        try {
            const json = await fetchJSON(
                `${BAKED_BASE_URL}/explore/indicators.json`
            )
            const indicators: Indicator[] = json.indicators
            return indicators
        } catch (error) {
            // TODO bubble up error to UI
            console.error("Failed to fetch indicators", error)
            return []
        }
    }

    private loadAllIdempotent(): Promise<Indicator[]> {
        if (!this.fetchAllPromise) {
            this.fetchAllPromise = new Promise(async resolve => {
                const indicators = await this.fetchAll()

                // Find all IDs which are marked as loading but were not
                // retrieved in fetchAll()
                const loadingIds = Object.entries(this.indicatorsById)
                    .filter(([id, entry]) => entry.isLoading)
                    .map(([id]) => parseInt(id))
                const loadedIds = indicators.map(i => i.id)
                const missingIds = difference(loadingIds, loadedIds)

                runInAction(() => {
                    // Update each loaded indicator in place
                    indicators.forEach(indicator => {
                        const storeEntry = this.get(indicator.id)
                        storeEntry.isLoading = false
                        storeEntry.lastRetrieved = new Date()
                        storeEntry.error = undefined
                        storeEntry.entity = indicator
                    })
                    // Mark all other indicator as failed
                    missingIds.forEach(id => {
                        const storeEntry = this.get(id)
                        storeEntry.isLoading = false
                        storeEntry.lastRetrieved = undefined
                        storeEntry.error = new Error(
                            `No indicator with id ${id}`
                        )
                    })
                })

                resolve(indicators)
            })
        }
        return this.fetchAllPromise
    }

    get(id: number): StoreEntry<Indicator> {
        if (!(id in this.indicatorsById)) {
            const entry = new StoreEntry<Indicator>()
            entry.isLoading = true
            this.indicatorsById[id] = entry
            this.loadAllIdempotent()
        }
        return this.indicatorsById[id]
    }

    async search(props: { query: string }): Promise<StoreEntry<Indicator>[]> {
        await this.loadAllIdempotent()
        const { query } = props
        const indicatorEntries = values(this.indicatorsById)
        if (!query) {
            // If there is no search query, return full list
            return indicatorEntries
        }
        const queryLower = query.toLowerCase()
        return indicatorEntries.filter(entry => {
            // Filter out entities that haven't loaded
            if (!entry.entity) return false
            const indicator = entry.entity
            const titleLower =
                (indicator.title && indicator.title.toLowerCase()) || ""
            return titleLower.indexOf(queryLower) > -1
        })
    }
}

export class RootStore {
    public indicators: IndicatorStore

    constructor() {
        this.indicators = new IndicatorStore()
    }
}
