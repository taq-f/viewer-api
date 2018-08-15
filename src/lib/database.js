import { MongoClient, ObjectID } from 'mongodb'

const DATABASE_URI = 'mongodb://127.0.0.1:27017'
let db

async function getDb() {
  if (!db) {
    let client
    try {
      client = await MongoClient.connect(DATABASE_URI, { useNewUrlParser: true })
      db = client.db('images')
    } catch (error) {
      throw new Error(error)
    }
  }
  return db
}

export async function getAll() {
  const db = await getDb()
  const collection = db.collection('images')
  const images = await collection.find(
    {},
    {
      projection: {
        name: 1,
        path: 1,
        // thumbnail: 1,
      },
      sort: [['name', 'ascending']],
    },
  ).limit(20).toArray()

  return images
}

export async function get(id) {
  const db = await getDb()
  const collection = db.collection('images')
  const image = await collection.findOne({ _id: new ObjectID(id) })

  return image
}
