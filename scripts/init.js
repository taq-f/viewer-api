const fs = require('fs')
const path = require('path')
const mongodb = require('mongodb')
const thumb = require('node-thumbnail').thumb

const root = path.join(__dirname, '..', 'assets')

function sort(stats) {
  const files = stats.filter(s => !s.directory)
  const directories = stats.filter(s => s.directory)
  // files first
  return [
    ...files.sort((s1, s2) => s1.name > s2.name),
    ...directories.sort((s1, s2) => s1.name > s2.name),
  ]
}

function walk(dir) {
  const allFiles = []
  walkHelper(dir, allFiles)
  return allFiles
}

function walkHelper(dir, arr) {
  const files = fs.readdirSync(dir)
    .map(f => {
      const absolutePath = path.join(dir, f)
      const s = fs.statSync(absolutePath)

      return {
        name: f,
        path: absolutePath,
        size: s.size,
        directory: s.isDirectory(),
      }
    })

  sort(files)

  for (f of files) {
    if (!f.directory) {
      arr.push(f)
    } else {
      walkHelper(f.path, arr)
    }
  }
}

function toThumbnails(files) {
  return Promise.all(
    files.map(f => thumb({
      source: f.path,
      destination: '.',
      quiet: true,
      width: 120,
    }))
  )
}

async function register(files) {
  let client
  try {
    client = await connect('mongodb://127.0.0.1:27017')
    const db = client.db('images')
    const result = await insert(db, files)
    console.log(result)
  } catch (error) {
    console.log('ERROR!', error)
  } finally {
    if (client) client.close()
  }
}

function connect(uri) {
  return new Promise((resolve, reject) => {
    mongodb.MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
      if (err) {
        reject(err)
      } else {
        resolve(db)
      }
    })
  })
}

function insert(db, files) {
  return new Promise((resolve, reject) => {
    db.collection('images').insertMany(files, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

async function main() {
  const files = walk(root)
  let thumbnails = await toThumbnails(files)
  thumbnails = thumbnails.map(t => t[0])

  const docs = files
    .map((f, i) => {
      const t = thumbnails[i];
      const base64 = fs.readFileSync(t.dstPath, 'base64')

      return {
        name: f.name,
        path: f.path.slice(root.length).replace(/\\/g, '/'),
        thumbnail: fs.readFileSync(t.dstPath, 'base64'),
        size: f.size,
      }
    })

  // clean up thumbnail images
  thumbnails.forEach(t => fs.unlinkSync(t.dstPath))

  await register(docs)
}

main()
