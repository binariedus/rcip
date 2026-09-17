import { appendFileSync } from 'node:fs'

// A missing window keeps new installs of the workflow inactive until explicitly configured.
const value = process.env.RCIP_HEALTH_UNTIL ?? ''
let state = 'inactive'
if (value) {
  const expiry = Date.parse(value)
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(expiry)) {
    throw new Error('RCIP_HEALTH_UNTIL must be a valid UTC ISO timestamp.')
  }
  if (expiry - Date.now() > 7 * 24 * 60 * 60_000 + 60_000) {
    throw new Error('RCIP_HEALTH_UNTIL must be no more than seven days ahead.')
  }
  state = Date.now() < expiry ? 'active' : 'expired'
}
const message = `RCIP scheduled health window: ${state}${value ? `; expires ${value}` : ''}`
console.log(message)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\n`)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`)
