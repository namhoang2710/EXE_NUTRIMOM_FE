// Capture synthetic QA request evidence only. Contains no browser/session credentials.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const label = process.argv[2]
if (!label) throw new Error('Provide a verified browser scenario label')
const { data } = await (await fetch('http://127.0.0.1:5198/__qa/state')).json()
assert.ok(data.calls.every((call) => !call.path.includes('pregnancy-content')))
const output = 'qa-artifacts/medical-record-scope'
await mkdir(output, { recursive: true })
let evidence = []
try { evidence = JSON.parse(await readFile(`${output}/browser-evidence.json`, 'utf8')) } catch { /* First capture. */ }
evidence.push({ label, captured_at: new Date().toISOString(), ...data })
await writeFile(`${output}/browser-evidence.json`, JSON.stringify(evidence, null, 2))
console.log(JSON.stringify({ label, scenario: data.scenario, calls: data.calls.length, medical_record_requests: data.calls.filter((call) => call.path.startsWith('/medical-records')).length, pregnancy_reads: data.calls.filter((call) => call.path === '/pregnancies').length }))
