export interface Logger {}

export interface Middleware {}

export default interface Opts {
    _isFake: boolean
    foreignKeySuffix: string
    noGzip: boolean
    noCors: boolean
    readOnly: boolean
    static: string
    logger: Logger
    bodyParser: Middleware
}
