#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')

function parseArgs(){
  const args = {}
  const raw = process.argv.slice(2)
  for(let i=0;i<raw.length;i++){
    const a = raw[i]
    if(a.startsWith('--')){
      const key = a.replace(/^--+/, '')
      const next = raw[i+1]
      if(next && !next.startsWith('--')){ args[key] = next; i++ } else { args[key] = true }
    }
  }
  return args
}
const argv = parseArgs()

const OUT_DIR = path.join(__dirname)
const resourcesFile = argv.resources || path.join(OUT_DIR, 'sample_resources.json')
const needsFile = argv.needs || path.join(OUT_DIR, 'sample_needs.json')

const base = argv.base || process.env.API_BASE || process.env.VITE_API_BASE || 'http://knapsack-alb-test-2101219521.us-east-2.elb.amazonaws.com'
const resourceBase = argv.resourceBase || argv.resource || process.env.API_RESOURCE || process.env.VITE_API_RESOURCE || base
const needBase = argv.needBase || argv.need || process.env.API_NEED || process.env.VITE_API_NEED || base

const BATCH = parseInt(argv.batch || 50, 10) || 50
const DELAY = parseInt(argv.delay || 200, 10) || 200

async function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')) }

async function post(url, obj){
  const body = JSON.stringify(obj)
  return new Promise((resolve, reject)=>{
    const u = new URL(url)
    const opts = { method: 'POST', hostname: u.hostname, port: u.port || (u.protocol === 'https:'?443:80), path: u.pathname + u.search, headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(body) } }
    const req = (u.protocol === 'https:' ? require('https') : require('http')).request(opts, res=>{
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c=>data+=c)
      res.on('end', ()=>{
        if(res.statusCode >= 200 && res.statusCode < 300) return resolve({status: res.statusCode, body: data})
        return reject(new Error(`HTTP ${res.statusCode}: ${data}`))
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function sendBatch(items, url, startIndex=0){
  for(let i=0;i<items.length;i++){
    const it = items[i]
    try{
      await post(url, it)
    }catch(err){
      console.error('Failed item', startIndex + i, it.id, err.message)
    }
  }
}

async function run(){
  if(!fs.existsSync(resourcesFile) || !fs.existsSync(needsFile)){
    console.error('Missing sample files. Run: node scripts/generate_sample_data.js')
    process.exit(1)
  }

  const resources = await readJson(resourcesFile)
  const needs = await readJson(needsFile)

  console.log('Will import', resources.length, 'resources to', resourceBase + '/resources')
  console.log('Will import', needs.length, 'needs to', needBase + '/needs')

  // helper to post in sequential batches
  async function postInBatches(items, url, prefix){
    for(let i=0;i<items.length;i+=BATCH){
      const batch = items.slice(i,i+BATCH)
      console.log(`Posting ${prefix} batch ${i+1}-${i+batch.length} to ${url}`)
      await sendBatch(batch, url, i+1)
      await new Promise(r=>setTimeout(r, DELAY))
    }
  }

  try{
    await postInBatches(resources, resourceBase + '/resources', 'resources')
    await postInBatches(needs, needBase + '/needs', 'needs')
    console.log('Done importing')
  }catch(err){
    console.error('Import failed', err)
  }
}

if(require.main === module) run()

module.exports = { run }
