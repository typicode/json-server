import express from 'express'

export default {
  create: () => express().set('json spaces', 2),
  defaults: require('./defaults'),
  router: require('./router'),
  rewriter: require('./rewriter'),
  bodyParser: require('./body-parser')
}
