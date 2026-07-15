import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const ffmpeg = join(
  process.cwd(),
  'resources',
  'ffmpeg',
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
)
if (!existsSync(ffmpeg)) throw new Error(`FFmpeg tidak ditemukan: ${ffmpeg}`)

const port = 19000 + Math.floor(Math.random() * 1000)
const latency = 180000
const listener = `srt://0.0.0.0:${port}?mode=listener&transtype=live&pkt_size=1316&latency=${latency}`
const caller = `srt://127.0.0.1:${port}?mode=caller&transtype=live&pkt_size=1316&latency=${latency}`
const senderArgs = [
  '-hide_banner',
  '-loglevel',
  'warning',
  '-re',
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=1280x720:rate=30',
  '-c:v',
  'libx264',
  '-preset',
  'ultrafast',
  '-tune',
  'zerolatency',
  '-pix_fmt',
  'yuv420p',
  '-g',
  '30',
  '-keyint_min',
  '30',
  '-sc_threshold',
  '0',
  '-b:v',
  '8M',
  '-maxrate',
  '8M',
  '-bufsize',
  '16M',
  '-an',
  '-f',
  'mpegts',
  '-mpegts_flags',
  '+resend_headers+initial_discontinuity',
  '-muxdelay',
  '0',
  '-muxpreload',
  '0',
  '-flush_packets',
  '1',
  listener
]
const receiverArgs = [
  '-hide_banner',
  '-loglevel',
  'info',
  '-i',
  caller,
  '-t',
  '3',
  '-map',
  '0:v:0',
  '-f',
  'null',
  '-'
]

function collect(child) {
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })
  return () => output
}

const sender = spawn(ffmpeg, senderArgs, { windowsHide: true })
const senderOutput = collect(sender)
await new Promise((resolve) => setTimeout(resolve, 500))
const receiver = spawn(ffmpeg, receiverArgs, { windowsHide: true })
const receiverOutput = collect(receiver)

const receiverCode = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Receiver SRT timeout')), 15000)
  receiver.once('exit', (code) => {
    clearTimeout(timer)
    resolve(code)
  })
  receiver.once('error', reject)
}).finally(() => {
  if (!sender.killed) sender.kill()
})

const output = receiverOutput()
if (receiverCode !== 0 || !/frame=\s*\d+/i.test(output)) {
  throw new Error(`Smoke test gagal. receiver=${receiverCode}\n${output}\n${senderOutput()}`)
}
const frameMatch = [...output.matchAll(/frame=\s*(\d+)/gi)].at(-1)
const frames = Number(frameMatch?.[1] || 0)
if (frames < 60) throw new Error(`Frame diterima terlalu sedikit: ${frames}`)
console.log(`[OBS SRT smoke] PASS - ${frames} frame diterima melalui ${caller}`)
