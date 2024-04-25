const { exec } = require('child_process')

console.log('Rebuilding library...')
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error.message}`)
    return
  }
  console.log(`Build output: ${stdout}`)
  if (stderr) console.error(`Build error output: ${stderr}`)

  console.log('Starting UI dev server...')
  const devProcess = exec('npm run dev:ui')
  devProcess.stdout.on('data', (data) => {
    console.log(data)
  })
  devProcess.stderr.on('data', (data) => {
    console.error(data)
  })
})
