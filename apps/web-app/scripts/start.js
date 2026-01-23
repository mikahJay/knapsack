const { spawn } = require('child_process')
const { execSync } = require('child_process')

const args = process.argv.slice(2)
const useRemote = args.includes('--remote') || args.includes('--aws')
const envNameIndex = args.findIndex(a => a === '--env')
const envName = (envNameIndex !== -1 && args[envNameIndex+1]) ? args[envNameIndex+1] : (process.env.ENV || 'test')

async function main() {
  let VITE_API_BASE
  if (useRemote) {
    const lbName = `knapsack-alb-${envName}`
    console.log(`Resolving ALB DNS for ${lbName} via AWS CLI`)
    try {
      const dns = execSync(`aws elbv2 describe-load-balancers --names ${lbName} --query \"LoadBalancers[0].DNSName\" --output text`, { stdio: ['ignore','pipe','inherit'] }).toString().trim()
      if (!dns || dns === 'None') throw new Error('ALB DNS not found')
      VITE_API_BASE = `http://${dns}`
      console.log(`Found ALB DNS: ${dns}`)
    } catch (err) {
      console.error('Failed to resolve ALB DNS:', err && err.message ? err.message : err)
      process.exit(2)
    }
  } else {
    VITE_API_BASE = 'http://localhost:5173' // base for web app; individual services are on different ports
  }

  // Map service endpoints
  const env = Object.assign({}, process.env)
  if (useRemote) {
    env.VITE_API_NEED = `${VITE_API_BASE}/need`
    env.VITE_API_RESOURCE = `${VITE_API_BASE}/resource`
    env.VITE_API_AUTH = `${VITE_API_BASE}/auth`
    env.VITE_API_BASE = VITE_API_BASE
  } else {
    // local ports for services
    env.VITE_API_NEED = 'http://localhost:4020/need'
    env.VITE_API_RESOURCE = 'http://localhost:4010/resource'
    env.VITE_API_AUTH = 'http://localhost:4001/auth'
    env.VITE_API_BASE = 'http://localhost:5173'
  }

  console.log('Starting Vite with:')
  console.log('  VITE_API_BASE=', env.VITE_API_BASE)
  console.log('  VITE_API_NEED=', env.VITE_API_NEED)
  console.log('  VITE_API_RESOURCE=', env.VITE_API_RESOURCE)
  console.log('  VITE_API_AUTH=', env.VITE_API_AUTH)

  // Spawn Vite through the shell to avoid Windows spawn EINVAL issues
  const cmd = process.platform === 'win32' ? 'npx.cmd vite' : 'npx vite'
  const child = spawn(cmd, { stdio: 'inherit', env, shell: true })
  child.on('error', err => {
    console.error('Failed to start Vite:', err && err.message ? err.message : err)
    process.exit(1)
  })
  child.on('exit', code => process.exit(code))

  // Forward signals to child and exit cleanly
  process.on('SIGINT', () => {
    try { child.kill('SIGINT') } catch(e) {}
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    try { child.kill('SIGTERM') } catch(e) {}
    process.exit(0)
  })
}

main()
