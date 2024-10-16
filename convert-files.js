const glob = require('glob')
const fs = require('node:fs')

glob('packages/adapters-library/src/**/*.ts', (err, files) => {
  if (err) throw err

  files.forEach((file) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) throw err

      const updatedData = data.replace(
        /(import .* from ['"])(.*)(['"])/g,
        (match, p1, p2, p3) => {
          if (!p2.endsWith('.js') && !p2.startsWith('.')) {
            return `${p1}${p2}.js${p3}`
          }
          return match
        },
      )

      fs.writeFile(file, updatedData, 'utf8', (err) => {
        if (err) throw err
        console.log(`Updated ${file}`)
      })
    })
  })
})
