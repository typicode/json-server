declare module 'server-ready' {
  export default function serverReady(port: number, done: () => void): void
}
