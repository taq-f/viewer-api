import Koa from 'koa'
import cors from '@koa/cors'
import Router from 'koa-router'
import { getList, get, getThumbnail } from './lib/database'

const app = new Koa()
const router = new Router()

// Cross-Origin Resource Sharing
app.use(cors())

// Set X-Response-Time
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}ms`)
})

// Logging
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// Routes

router.get('/images', async (ctx, next) => {
  const { q, limit, offset } = ctx.request.query

  ctx.body = await getList({
    filter: q,
    limit: Number(limit),
    offset: Number(offset),
  })
})

router.get('/images/thumbnails/:id', async (ctx, next) => {
  const id = ctx.params.id
  ctx.body = await getThumbnail(id)
})

router.get('/images/:id', async (ctx, next) => {
  const id = ctx.params.id
  ctx.type = 'image/png'
  ctx.body = await get(id)
})

app.use(router.routes())

// Start server
app.listen(3000)
