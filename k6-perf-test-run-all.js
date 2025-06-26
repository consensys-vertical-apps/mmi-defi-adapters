const { spawn } = require('node:child_process')

const commands = [
  { name: 'perf:smoke', cmd: 'npm', args: ['run', 'perf:smoke'] },
  { name: 'perf:load-test', cmd: 'npm', args: ['run', 'perf:load-test'] },
  { name: 'perf:stress-test', cmd: 'npm', args: ['run', 'perf:stress-test'] },
  {
    name: 'perf:load-test:random',
    cmd: 'npm',
    args: ['run', 'perf:load-test:random'],
  },
  {
    name: 'perf:stress-test:random',
    cmd: 'npm',
    args: ['run', 'perf:stress-test:random'],
  },
  {
    name: 'perf:spike-test:random',
    cmd: 'npm',
    args: ['run', 'perf:spike-test:random'],
  },
  {
    name: 'perf:soak-test:random',
    cmd: 'npm',
    args: ['run', 'perf:soak-test:random'],
  },
]

async function runCommandsSequentially(cmds) {
  for (const { name, cmd, args } of cmds) {
    console.log(`\n=== Running "${name}" ===`)
    await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: 'inherit' })
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command "${name}" failed with exit code ${code}`))
        } else {
          resolve()
        }
      })
    })
  }
}

runCommandsSequentially(commands)
  .then(() => {
    console.log('\nAll performance tests completed.')
  })
  .catch((err) => {
    console.error('\nError:', err.message)
    process.exit(1)
  })
