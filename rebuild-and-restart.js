const { exec } = require('child_process')

console.log('Rebuilding library...')
const libraryProcess = exec('npm run build', (error) => {
  if (error) {
    return
  }

  console.log('Starting backend dev server...')
  const beProcess = exec('npm run dev -w packages/adapters-api')
  beProcess.stdout.on('data', (data) => {
    console.log(data)
  })
  beProcess.stderr.on('data', (data) => {
    console.error(data)
  })

  console.log('Starting UI dev server...')
  const uiProcess = exec('npm run dev -w packages/dev-ui')
  uiProcess.stdout.on('data', (data) => {
    console.log(data)
  })
  uiProcess.stderr.on('data', (data) => {
    console.error(data)
  })
})

libraryProcess.stdout.on('data', (data) => {
  console.log(data)
})
libraryProcess.stderr.on('data', (data) => {
  console.error(data)
})
