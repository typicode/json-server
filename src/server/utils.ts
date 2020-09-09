function getPage(array: Array<any>, page: number, perPage: number): Page {
  var obj: Page = {items: [], prev: null, next: null, current: null, first: null, last: null}
  var start = (page - 1) * perPage
  var end = page * perPage

  obj.items = array.slice(start, end)
  if (obj.items.length === 0) {
    return obj
  }

  if (page > 1) {
    obj.prev = page - 1
  }

  if (end < array.length) {
    obj.next = page + 1
  }

  if (obj.items.length !== array.length) {
    obj.current = page
    obj.first = 1
    obj.last = Math.ceil(array.length / perPage)
  }

  return obj
}

type Page = {
    items: Array<any>
    prev: any
    next: any
    current: any
    first: any
    last: any
}

type Request = {
    query: Query
    protocol: string
    host: string
    originalUrl: string
    method: string
    params: Params
    body: string
    url: string
}

type Params = {
    id: any
    resource: any
    nested: any
}

interface Query extends Array<any> {
    _delay: string
    _expand: any
    _embed: any
    q: string
    _start: number
    _end: number
    _page: number
    _sort: any
    _order: any
    _limit: number
}

interface Response {
    locals: Locals
    
    header(key: string, value: string): void
    
    setHeader(key: string, value: string): void
    
    sendStatus(status: number): void
    
    status(status: number): Response
    
    location(location: string): void
    
    links(links: any): void
}

type Locals = {
    data: any
}

type Next = () => void

export { getPage , Page, Request, Response, Next }
