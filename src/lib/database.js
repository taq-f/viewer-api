import { MongoClient } from 'mongodb'

const DATABASE_URI = 'mongodb://127.0.0.1:27017'

export async function getAll() {
  let client
  try {
    client = await MongoClient.connect(DATABASE_URI, { useNewUrlParser: true })
    const db = client.db('images')
    const collection = db.collection('images')
    const images = await collection.find(
      {},
      {
        projection: {
          name: 1,
        },
      },
    ).toArray()

    return images
  } catch (error) {
    throw new Error(error)
  } finally {
    if (client) client.close()
  }
}
