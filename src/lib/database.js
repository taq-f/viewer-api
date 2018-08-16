import { MongoClient, ObjectID } from 'mongodb'
import { join } from 'path';
import { readFile } from 'fs';

/**
 * Database connection URI
 *
 * should be refactored
 *
 * @type {String}
 */
const DATABASE_URI = 'mongodb://127.0.0.1:27017'

/**
 * Root directory of images
 *
 * should be refactored
 *
 * @type {String}
 */
const IMAGE_ROOT_PATH = join(__dirname, '..', 'assets')

/**
 * Number of records be returned
 *
 * might be overriden by user specified parameter.
 *
 * @type {Number}
 */
const DEFAULT_RESPONSE_NUM = 30

/**
 * Database connection
 *
 * This must not be exposed to other modules. Plus, even within this module,
 * this should not be refrenced directly (use getDB).
 */
let _db

/**
 * Get database connection
 *
 * All connection requests should be accomplished through this function
 * from connection pooling perspevtive.
 */
async function getDB() {
  if (!_db) {
    let client
    try {
      client = await MongoClient.connect(DATABASE_URI, { useNewUrlParser: true })
      _db = client.db('images')
    } catch (error) {
      throw new Error(error)
    }
  }
  return _db
}

/**
 * Get list of basic image information
 *
 * Accepts query options described below.
 *
 * * filter
 * * limit
 *
 * @param {Object} options
 * @return {Array}
 */
export async function getList(options = {}) {
  const db = await getDB()
  const collection = db.collection('images')

  // db query parameter
  const query = {}
  if (options.filter) {
    query.name = new RegExp(options.filter)
  }

  // the number of documeents be retrieved
  // TODO need max?
  const limit = options.limit || DEFAULT_RESPONSE_NUM

  const images = await collection.find(
    query,
    {
      projection: {
        name: 1,
        path: 1,
      },
      sort: [['name', 'ascending']],
    },
  ).limit(limit).toArray()

  return images
}

/**
 * Get buffer of the image
 *
 * @param {String} id
 * @return {Buffer}
 */
export async function get(id) {
  const db = await getDB()
  const collection = db.collection('images')

  const image = await collection.findOne({ _id: new ObjectID(id) })

  const buffer = await new Promise((resolve, reject) => {
    readFile(join(IMAGE_ROOT_PATH, image.path), (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
  return buffer
}

/**
 * Get thumbnail (base64 encoded)
 *
 * @param {String} id
 */
export async function getThumbnail(id) {
  const db = await getDB()
  const collection = db.collection('images')

  const image = await collection.findOne(
    {
      _id: new ObjectID(id),
    },
    {
      projection: {
        thumbnail: 1,
      }
    })

  return image
}
