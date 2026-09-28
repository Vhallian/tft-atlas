import type { Comp } from '../types'

// Codifica una comp en una cadena corta para compartir por URL (deflate + base64url)
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const res = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await res.arrayBuffer())
}
const toB64 = (u: Uint8Array) =>
  btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

export async function encodeComp(comp: Comp): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(comp))
  if (typeof CompressionStream === 'undefined') return 'j' + toB64(json)
  return 'z' + toB64(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodeComp(code: string): Promise<Comp> {
  const kind = code[0]
  const bytes = fromB64(code.slice(1))
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes
  return JSON.parse(new TextDecoder().decode(raw))
}
