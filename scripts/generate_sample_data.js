const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname)

const owners = [
  'alice@example.com',
  'bob@example.com',
  'carol@example.com',
  'dan@example.com',
  'eve@example.com',
  'frank@example.com',
  'gina@example.com',
  'hugo@example.com',
  'ivy@example.com',
  'jack@example.com',
  'mikah.trent@gmail.com'
]

const nouns = [
  'blanket','chair','laptop','bike','baby carrier','toddler car seat','pet food','school supplies','tent','heater',
  'books','desk lamp','winter coat','generators','tools','guitar','printer','phone charger','backpack','stroller'
]

const needPhrases = [
  'someone to talk to',
  'help with math homework',
  'a ride to the grocery store',
  'assistance moving a couch',
  'tutoring for high school chemistry',
  'a volunteer to walk a dog',
  'help setting up a laptop',
  'a babysitter for an afternoon',
  'garden help for a weekend',
  'meal prep for one day'
]

const resourceTemplates = [
  name => `I can lend my ${name} in good condition. Pickup preferred.`,
  name => `Offering ${name} — available this weekend.`,
  name => `Free ${name} for anyone who needs it. Works fine.`,
  name => `Have a ${name} I no longer use; would love it to go to someone who needs it.`
]

const needTemplates = [
  name => `Looking for ${name} for a short term; able to pick up.`,
  name => `Need ${name} to help with day-to-day chores.`,
  name => `Would appreciate ${name} for my child this week.`,
  name => `Seeking ${name} — happy to compensate or exchange.`
]

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)] }

function makeName(isNeed){
  // 20% chance to use a phrase for more natural 'needs'
  if(isNeed && Math.random() < 0.2) return choice(needPhrases)
  // 15% chance to return a longer help-like phrase
  if(Math.random() < 0.15) return choice(needPhrases)
  return choice(nouns)
}

function makeDescription(name, isNeed){
  if(isNeed) return choice(needTemplates)(name)
  return choice(resourceTemplates)(name)
}

function makeItem(idPrefix, i, isNeed){
  const name = makeName(isNeed)
  const description = makeDescription(name, isNeed)
  const quantity = randInt(1,10)
  const owner = choice(owners)
  const created_at = new Date(Date.now() - Math.floor(Math.random()*31536000000)).toISOString()
  return {
    id: `${idPrefix}-${i}`,
    name,
    description,
    quantity,
    owner,
    public: true,
    created_at
  }
}

function generate(count, idPrefix, isNeed){
  const out = []
  for(let i=1;i<=count;i++) out.push(makeItem(idPrefix,i,isNeed))
  return out
}

function writeFile(name, data){
  const p = path.join(OUT_DIR, name)
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
  console.log('Wrote', p)
}

function main(){
  const resources = generate(1000, 'res', false)
  const needs = generate(1000, 'need', true)
  writeFile('sample_resources.json', resources)
  writeFile('sample_needs.json', needs)
  console.log('Owners used:', Array.from(new Set(resources.concat(needs).map(it=>it.owner))).slice(0,20))
  console.log('Done: generated', resources.length, 'resources and', needs.length, 'needs')
}

if(require.main === module) main()

module.exports = { generate, makeItem }
