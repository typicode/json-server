import {Request, Response, Next} from "../utils"

export default function write(db: any) {
  return (req: Request, res: Response, next: Next) => {
    db.write()
    next()
  }
}
