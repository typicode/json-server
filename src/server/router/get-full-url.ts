import url from 'url'
import {Request} from "../utils"

export default (req: Request) => {
  const root = url.format({
    protocol: req.protocol,
    host: req.host
  })

  return `${root}${req.originalUrl}`
}
