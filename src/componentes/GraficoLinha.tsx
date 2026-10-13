import { useState, type PointerEvent } from 'react'
import { deDataISO, type DataISO } from '../lib/datas'

// Gráfico de linha de uma série só (sem legenda: o título já diz o que é).
// Linha 2px, pontos ≥ 8px com anel da cor do fundo, grade fina e apagada, valor
// escrito só no último ponto; tocar/arrastar mostra o ponto mais próximo.
// Desenhado em SVG puro (sem biblioteca), com viewBox: escala com a largura.

const L = 340
const A = 180
const M = { esq: 38, dir: 52, topo: 12, base: 22 }

/** Passo "redondo" (1, 2, 2,5, 5 × 10ⁿ) para os rótulos do eixo. */
function passoRedondo(bruto: number) {
  const p = Math.pow(10, Math.floor(Math.log10(bruto)))
  const n = bruto / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

export function GraficoLinha({ pontos, formatar, descricao }: {
  pontos: { data: DataISO; valor: number }[]
  formatar: (v: number) => string
  descricao: string
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  if (pontos.length === 0) return null

  const valores = pontos.map((p) => p.valor)
  let min = Math.min(...valores)
  let max = Math.max(...valores)
  if (min === max) {
    min -= Math.max(1, min * 0.1)
    max += Math.max(1, max * 0.1)
  }
  const passo = passoRedondo((max - min) / 3)
  const yMin = Math.floor(min / passo) * passo
  const yMax = Math.ceil(max / passo) * passo
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + passo / 2; v += passo) ticks.push(v)

  const tempos = pontos.map((p) => deDataISO(p.data).getTime())
  const t0 = tempos[0]
  const t1 = tempos[tempos.length - 1]
  const x = (i: number) =>
    t1 === t0 ? M.esq + (L - M.esq - M.dir) / 2 : M.esq + ((tempos[i] - t0) / (t1 - t0)) * (L - M.esq - M.dir)
  const y = (v: number) => M.topo + (1 - (v - yMin) / (yMax - yMin)) * (A - M.topo - M.base)

  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${caminho} L${x(pontos.length - 1).toFixed(1)},${A - M.base} L${x(0).toFixed(1)},${A - M.base} Z`
  const curta = (d: DataISO) => deDataISO(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')

  function apontar(e: PointerEvent<SVGSVGElement>) {
    const caixa = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - caixa.left) / caixa.width) * L
    let melhor = 0
    pontos.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(melhor) - px)) melhor = i
    })
    setAtivo(melhor)
  }

  const ultimo = pontos.length - 1
  const marcado = ativo ?? null

  return (
    <figure className="grafico">
      <div className="grafico-area">
        <svg
          viewBox={`0 0 ${L} ${A}`}
          role="img"
          aria-label={descricao}
          onPointerDown={apontar}
          onPointerMove={apontar}
          onPointerLeave={() => setAtivo(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line className="grafico-grade" x1={M.esq} x2={L - M.dir + 8} y1={y(v)} y2={y(v)} />
              <text className="grafico-eixo" x={M.esq - 6} y={y(v) + 3.5} textAnchor="end">
                {formatar(v)}
              </text>
            </g>
          ))}
          <text className="grafico-eixo" x={x(0)} y={A - 6} textAnchor={pontos.length > 1 ? 'start' : 'middle'}>
            {curta(pontos[0].data)}
          </text>
          {pontos.length > 1 && (
            <text className="grafico-eixo" x={x(ultimo)} y={A - 6} textAnchor="end">
              {curta(pontos[ultimo].data)}
            </text>
          )}

          {pontos.length > 1 && <path className="grafico-area-preench" d={area} />}
          {pontos.length > 1 && <path className="grafico-linha" d={caminho} />}

          {marcado !== null && (
            <line className="grafico-guia" x1={x(marcado)} x2={x(marcado)} y1={M.topo} y2={A - M.base} />
          )}
          {pontos.map((p, i) => (
            <circle
              key={i}
              className="grafico-ponto"
              cx={x(i)}
              cy={y(p.valor)}
              r={i === marcado ? 6 : 4}
            />
          ))}
          {marcado === null && (
            <text className="grafico-valor" x={x(ultimo) + 9} y={y(pontos[ultimo].valor) + 4}>
              {formatar(pontos[ultimo].valor)}
            </text>
          )}
        </svg>
        {marcado !== null && (
          <div
            className="grafico-dica"
            style={{ left: `${(x(marcado) / L) * 100}%`, top: `${(y(pontos[marcado].valor) / A) * 100}%` }}
          >
            <strong>{formatar(pontos[marcado].valor)}</strong>
            <span>{curta(pontos[marcado].data)}</span>
          </div>
        )}
      </div>
    </figure>
  )
}
