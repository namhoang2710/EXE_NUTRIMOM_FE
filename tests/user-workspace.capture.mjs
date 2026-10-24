// Capture only synthetic loopback request metadata, never credentials or bodies.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const label = process.argv[2]
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Expected a short evidence label')
const output = 'qa-artifacts/user-workspace-audit-2026-10-24'
await mkdir(output, { recursive: true })
const state = await (await fetch('http://127.0.0.1:5199/__qa/state')).json()
let evidence = []
try { evidence = JSON.parse(await readFile(`${output}/request-evidence.json`, 'utf8')) } catch (reason) { if (reason.code !== 'ENOENT') throw reason }
evidence.push({ label, capturedAt: new Date().toISOString(), ...state.data })
await writeFile(`${output}/request-evidence.json`, JSON.stringify(evidence, null, 2))
console.log(JSON.stringify({ label, requests: state.data.calls.length, missing: state.data.missing }))
