import * as fs from "fs-extra"
import sharp from "sharp"
import * as path from "path"
import svgo from "svgo"

declare var global: any
global.window = { location: { search: "" } }
global.App = { isEditor: false }

import { ChartConfig, ChartConfigProps } from "charts/ChartConfig"

const svgoConfig: svgo.Options = {
    floatPrecision: 2,
    plugins: [
        { collapseGroups: false }, // breaks the "Our World in Data" logo in the upper right
        { removeUnknownsAndDefaults: false }, // would remove hrefs from links (<a>)
        { removeViewBox: false },
        { removeXMLNS: false }
    ]
}

const svgoInstance = new svgo(svgoConfig)

export async function optimizeSvg(svgString: string): Promise<string> {
    const optimizedSvg = await svgoInstance.optimize(svgString)
    return optimizedSvg.data
}

export async function chartToSVG(
    jsonConfig: ChartConfigProps,
    vardata: any
): Promise<string> {
    const chart = new ChartConfig(jsonConfig)
    chart.isLocalExport = true
    chart.receiveData(vardata)
    return chart.staticSVG
}

export async function bakeImageExports(
    outDir: string,
    jsonConfig: ChartConfigProps,
    vardata: any,
    optimizeSvgs = false
) {
    const chart = new ChartConfig(jsonConfig)
    chart.isLocalExport = true
    chart.receiveData(vardata)
    const outPath = path.join(outDir, chart.props.slug as string)

    let svgCode = chart.staticSVG
    if (optimizeSvgs) svgCode = await optimizeSvg(svgCode)

    return Promise.all([
        fs
            .writeFile(`${outPath}.svg`, svgCode)
            .then(_ => console.log(`${outPath}.svg`)),
        sharp(Buffer.from(chart.staticSVG), { density: 144 })
            .png()
            .resize(chart.idealBounds.width, chart.idealBounds.height)
            .flatten({ background: "#ffffff" })
            .toFile(`${outPath}.png`)
    ])
}
