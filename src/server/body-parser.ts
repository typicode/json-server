import bodyParser from 'body-parser'

export default [
  bodyParser.json({ limit: '10mb' }),
  bodyParser.urlencoded({ extended: false })
]
