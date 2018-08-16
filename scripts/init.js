const fs = require('fs')
const path = require('path')
const mongodb = require('mongodb')
const thumb = require('node-thumbnail').thumb

const ROOT = path.join(__dirname, '..', 'assets')

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

  for (f of files) {
    if (!f.directory) {
      arr.push(f)
    } else {
      walkHelper(f.path, arr)
    }
  }
}

async function main() {
  // get image files recursively
  let files = walk(ROOT)

  // convert files into more convinient form
  files = files.map(f => {
    return {
      name: path.basename(f.path, path.extname(f.path)), // no extension, since different format images are merged
      path: f.path.slice(ROOT.length).replace(new RegExp('\\' + path.sep, 'g'), '/'),
      extension: path.extname(f.path).slice(1).toLowerCase(),
    }
  })

  // filter unwanted files (unsupported image files, text files, etc)
  const supported = new Set(['jpg', 'jpeg', 'png'])
  files = files.filter(f => supported.has(f.extension))

  let client
  try {
    // open database
    client = await mongodb.MongoClient.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true })
    const db = client.db('images')
    const collection = db.collection('images')

    // clean up
    await collection.deleteMany({})

    // register files into database
    // MongoDB Document format
    // {
    //   "_id": "id, which mongodb gives",
    //   "name": "name of the file without extension",
    //   "path": {
    //     "png": "png file path",
    //     "jpeg": "jpeg file path"
    //   },
    //   "formats": [ "jpeg", "png" ]
    // }

    for (const file of files) {
      // find the name to see if it's already registered
      const doc = await collection.findOne({ name: file.name })

      if (doc) {
        // if the file already exists on database, merge it
        await collection.updateOne(
          { _id: new mongodb.ObjectID(doc._id) },
          {
            $set: {
              path: Object.assign(
                file.extension === 'png' ? { png: file.path } : { jpeg: file.path },
                doc.path
              ),
              formats: [...doc.formats, file.extension]
            }
          }
        )
      } else {
        await collection.insertOne({
          name: file.name,
          path: file.extension === 'png' ? { png: file.path } : { jpeg: file.path },
          formats: [file.extension],
          thumbnail: '',
        })
      }
    }

    // add thumbnails
    for (const doc of await collection.find({}).toArray()) {
      let p // image path fr thumbnal

      if (doc.formats.includes('png')) {
        p = doc.path.png
      } else if (doc.formats.includes('jpeg')) {
        p = doc.path.jpeg
      } else {
        console.log('WARN!', `unable to generate thumbnail for ${doc.name}`)
        continue
      }

      const thumbnailInfo = await thumb({
        source: path.join(ROOT, p),
        destination: '.',
        quiet: true,
        width: 120,
      })

      await collection.updateOne(
        { _id: new mongodb.ObjectID(doc._id) },
        {
          $set: {
            thumbnail: fs.readFileSync(thumbnailInfo[0].dstPath, 'base64')
          }
        }
      )

      fs.unlinkSync(thumbnailInfo[0].dstPath)
    }

  } catch (error) {
    console.log('ERROR!', error)
  } finally {
    if (client) client.close()
  }
}

main()
