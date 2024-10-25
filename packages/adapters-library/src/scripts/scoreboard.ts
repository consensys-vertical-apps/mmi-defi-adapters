import * as fs from 'node:fs'
import * as path from 'node:path'

function listMatchingFiles(): string[] {
  const results: string[] = []

  function searchDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir)

    for (const file of files) {
      const fullPath = path.join(currentDir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        if (file === 'tests') {
          const snapshotsDir = path.join(fullPath, 'snapshots')
          if (
            fs.existsSync(snapshotsDir) &&
            fs.statSync(snapshotsDir).isDirectory()
          ) {
            const snapshotFiles = fs.readdirSync(snapshotsDir)
            for (const snapshotFile of snapshotFiles) {
              if (
                snapshotFile.endsWith('.json') &&
                /.*\.positions.*\.json/.test(snapshotFile)
              ) {
                results.push(path.join(snapshotsDir, snapshotFile))
              }
            }
          }
        } else {
          searchDirectory(fullPath)
        }
      }
    }
  }

  searchDirectory('packages/adapters-library/src/adapters')
  return results
}

function extractValuesFromFiles(files: string[]) {
  const extractedValues: {
    key: string | undefined
    protocolId: string
    productId: string
    chain: string
    latency: number
    totalCalls: number
    relativeMaxStartTime: number | undefined
    relativeMaxEndTime: number | undefined
    maxTakenTime: number
    totalGas: string
  }[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const jsonObject = JSON.parse(content) as {
      latency: string
      rpcResponses: Record<
        string,
        {
          metrics: {
            startTime: number
            endTime: number
            timeTaken: number
            estimatedGas: string | undefined
          }
        }
      >
    }

    const latency = Number.parseFloat(
      jsonObject.latency.match(/^Latency: (.*) seconds$/)![1]!,
    )

    const fileMatch = file.match(
      /^packages\/adapters-library\/src\/adapters\/(.*)\/products\/(.*)\/tests\/snapshots\/(.*)\.positions(?:\.(.*))?\.json$/,
    )

    if (Object.values(jsonObject.rpcResponses).length === 0) {
      extractedValues.push({
        key: fileMatch?.[4],
        protocolId: fileMatch?.[1]!,
        productId: fileMatch?.[2]!,
        chain: fileMatch?.[3]!,
        latency,
        relativeMaxStartTime: undefined,
        relativeMaxEndTime: undefined,
        totalCalls: 0,
        maxTakenTime: 0,
        totalGas: '0',
      })

      continue
    }

    let minStartTime: number | undefined
    let maxStartTime: number | undefined
    let minEndTime: number | undefined
    let maxEndTime: number | undefined
    let totalCalls = 0
    let maxTakenTime = 0
    let totalGas = 0n
    for (const { metrics } of Object.values(jsonObject.rpcResponses)) {
      if (minStartTime === undefined || metrics.startTime < minStartTime) {
        minStartTime = metrics.startTime
      }
      if (maxStartTime === undefined || metrics.startTime > maxStartTime) {
        maxStartTime = metrics.startTime
      }
      if (minEndTime === undefined || metrics.endTime < minEndTime) {
        minEndTime = metrics.endTime
      }
      if (maxEndTime === undefined || metrics.endTime > maxEndTime) {
        maxEndTime = metrics.endTime
      }

      if (metrics.timeTaken > maxTakenTime) {
        maxTakenTime = metrics.timeTaken
      }

      totalGas += BigInt(metrics.estimatedGas ?? 0)

      totalCalls++
    }

    extractedValues.push({
      key: fileMatch?.[4],
      protocolId: fileMatch?.[1]!,
      productId: fileMatch?.[2]!,
      chain: fileMatch?.[3]!,
      latency,
      relativeMaxStartTime: (maxStartTime! - minStartTime!) / 1_000,
      relativeMaxEndTime: (maxEndTime! - minStartTime!) / 1_000,
      totalCalls,
      maxTakenTime: maxTakenTime / 1_000,
      totalGas: totalGas.toString(),
    })
  }

  return extractedValues
}

const matchingFiles = listMatchingFiles()
const extractedValues = extractValuesFromFiles(matchingFiles)
extractedValues.sort((a, b) => a.latency - b.latency)

console.log(matchingFiles.length)
console.log(JSON.stringify(extractedValues, null, 2))
