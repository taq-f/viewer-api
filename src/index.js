// const Koa = require('koa')
import Koa from 'koa'
import { getAll } from './lib/database'

const app = new Koa()

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

app.use(async ctx => {
  const images = await getAll()
  ctx.body = images
})

app.listen(3000)
