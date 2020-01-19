declare module 'connect-pause' {
    export default function pause(delay: number): (req: Request, res: Response, next: () => void) => void
}
