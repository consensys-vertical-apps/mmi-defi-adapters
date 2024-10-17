const { exec } = require('child_process')

console.log('Rebuilding library...')
const libraryProcess = exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error.message}`)
    return
  }
  console.log(`Build output: ${stdout}`)
  if (stderr) console.error(`Build error output: ${stderr}`)

  console.log('Starting backend dev server...')
  const beProcess = exec('npm run dev -w packages/dev-backend')
  beProcess.stdout.on('data', (data) => {
    console.log(data)
  })
  beProcess.stderr.on('data', (data) => {
    console.error(data)
  })

  console.log('Starting UI dev server...')
  exec('npm run dev -w packages/dev-ui')
})

libraryProcess.stdout.on('data', (data) => {
  console.log(data)
})
libraryProcess.stderr.on('data', (data) => {
  console.error(data)
})
