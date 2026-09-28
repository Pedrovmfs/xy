// Gera os ícones PNG do app (sem dependências): fundo escuro com um anel claro,
// a ideia de um "espelho". Rode com `npm run icones`; os PNGs ficam em public/.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const FUNDO = [0x26, 0x25, 0x22]
const ANEL = [0xe9, 0xe4, 0xda]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([len, corpo, crc])
}

// escala: tamanho do anel em relação ao ícone (menor nos "maskable", que o sistema recorta)
function png(tamanho, escala) {
  const linhas = []
  const c = tamanho / 2
  const rExt = tamanho * 0.3 * escala
  const rInt = tamanho * 0.22 * escala
  const ss = 4 // supersampling para bordas suaves
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 3)
    for (let x = 0; x < tamanho; x++) {
      let dentro = 0
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const d = Math.hypot(x + (sx + 0.5) / ss - c, y + (sy + 0.5) / ss - c)
          if (d <= rExt && d >= rInt) dentro++
        }
      const a = dentro / (ss * ss)
      for (let i = 0; i < 3; i++) linha[1 + x * 3 + i] = Math.round(FUNDO[i] * (1 - a) + ANEL[i] * a)
    }
    linhas.push(linha)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tamanho, 0)
  ihdr.writeUInt32BE(tamanho, 4)
  ihdr[8] = 8 // bits
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/apple-touch-icon.png', png(180, 1))
writeFileSync('public/icon-192.png', png(192, 1))
writeFileSync('public/icon-512.png', png(512, 1))
writeFileSync('public/icon-maskable-512.png', png(512, 0.8))
console.log('ícones gerados em public/')
