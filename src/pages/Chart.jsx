import { Box, Heading } from '@chakra-ui/react'
import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import useAppStore from '../store/useAppStore'
import { addDays, format, parseISO } from 'date-fns'

export default function Chart() {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const rafRef = useRef(0)
  const roRef = useRef(null)
  const { settings, days } = useAppStore()

  const HORIZON_DAYS = 365 // meses siguientes con scroll
  // Inicio dinámico: usar la fecha de inicio configurada
  const startISO = settings.startDate || '2025-07-30'
  // Helpers de fecha (UTC) para evitar desfases por zona horaria
  const ymdToUTC = (s) => {
    const m = String(s).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
      return Date.UTC(y, mo - 1, d)
    }
    const dObj = parseISO(String(s).trim())
    return isNaN(dObj) ? NaN : dObj.getTime()
  }
  const parseDateKey = (s) => {
    const ts = ymdToUTC(s)
    return Number.isFinite(ts) ? new Date(ts) : null
  }
  const START_TS = ymdToUTC(startISO)

  const { categories, datasetSource } = useMemo(() => {
    // 1) Eje X: días desde la fecha de inicio dinámica hasta (último día real + 60)
    const start = parseDateKey(startISO)
    const startTs = START_TS
    // Normaliza claves de days a 'yyyy-MM-dd' (acepta 'YYYY-M-D')
    const srcDays = days || {}
    const normDays = {}
    for (const k of Object.keys(srcDays)) {
      if (!k) continue
      const dt = parseDateKey(k)
      if (dt instanceof Date && !isNaN(dt)) {
        const normKey = format(dt, 'yyyy-MM-dd')
        const prev = normDays[normKey]
        const cur = srcDays[k] || {}
        // Merge simple (evita perder datos si hubiera duplicados de la misma fecha)
        normDays[normKey] = {
          ...(prev || {}),
          ...cur,
          dailySum: Number((prev?.dailySum || 0) + (cur?.dailySum || 0)),
          withdrawal: Number((prev?.withdrawal || 0) + (cur?.withdrawal || 0)),
          reward: Number((prev?.reward || 0) + (cur?.reward || 0)),
        }
      }
    }
    const keys = Object.keys(normDays)
    let lastRealTs = null
    for (const k of keys) {
      const ts = ymdToUTC(k)
      if (Number.isFinite(ts)) lastRealTs = lastRealTs == null ? ts : Math.max(lastRealTs, ts)
    }
    const endByLastReal = lastRealTs ? +addDays(new Date(lastRealTs), 60) : null
    const endByMinHorizon = +addDays(start, 120)
    const horizonEndTs = Math.max(endByLastReal || 0, endByMinHorizon)
    const totalDays = Math.max(1, Math.round((horizonEndTs - startTs) / (24 * 3600 * 1000)) + 1)
    const categories = []
    for (let i = 0; i < totalDays; i++) {
      categories.push(format(addDays(start, i), 'yyyy-MM-dd'))
    }

    // 2) Curva VERDE (Cartera real EOD):
    //    acumulando señales reales, retiros y recompensas hasta el último día con datos.
    const orderedRealDays = Object.keys(normDays)
    const lastRealISO = (orderedRealDays.length && keys.length && lastRealTs) ? format(new Date(lastRealTs), 'yyyy-MM-dd') : null
    let realCurrent = Number(settings.initialPortfolio) || 0
    const realByDay = {}
    for (let i = 0; i < categories.length; i++) {
      const d = categories[i]
      if (i === 0) {
        // Punto de inicio: valor inicial en la fecha de inicio
        realByDay[d] = Number(realCurrent.toFixed(2))
        continue
      }
      const dTs = ymdToUTC(d)
      if (lastRealTs && dTs <= lastRealTs) {
        const dayData = normDays[d]
        const s = Number(dayData?.dailySum) || 0
        const wd = Number(dayData?.withdrawal) || 0
        const rw = Number(dayData?.reward) || 0
        realCurrent = Number((realCurrent + s - wd + rw).toFixed(2))
        realByDay[d] = realCurrent
      } else {
        realByDay[d] = null // fuera del histórico real
      }
    }

    // 3) Curva AZUL (Pronóstico) EOD:
    //    cada día se hacen 3 señales; en cada señal se invierte 1% y se obtiene 58% de retorno sobre ese 1%.
    //    Ganancia por señal = 0.01 * 0.58 = 0.0058 (0.58%). Compuesto 3 veces al día.
    const gainPerSignal = 0.01 * 0.58
    const dailyFactor = (1 + gainPerSignal) ** 3
    let forecastCurrent = Number(settings.initialPortfolio) || 0
    const forecastByDay = {}
    for (let i = 0; i < categories.length; i++) {
      const d = categories[i]
      if (i === 0) {
        // Punto de inicio: valor inicial
        forecastByDay[d] = Number(forecastCurrent.toFixed(2))
        continue
      }
      // Aplicar retiros del día al inicio y luego crecimiento diario (ignorar recompensas)
      const wd = Number(normDays[d]?.withdrawal) || 0
      const base = forecastCurrent - wd
      forecastCurrent = Number((base * dailyFactor).toFixed(2))
      forecastByDay[d] = forecastCurrent
    }

    // 4) Dataset: timestamp + series
    const source = []
    for (const d of categories) {
      source.push({ date: ymdToUTC(d), forecast: forecastByDay[d], real: realByDay[d] })
    }

    // Debug: último día del dataset
    try {
      const lastRow = source[source.length - 1]
      const lastDatasetDate = lastRow ? new Date(lastRow.date).toISOString().slice(0,10) : '—'
      // eslint-disable-next-line no-console
      console.debug('[Chart:data]', { startISO, rows: source.length, lastDatasetDate })
    } catch {}
    return { categories, datasetSource: source }
  }, [days, settings.initialPortfolio, settings.startDate])

  // Init and dispose only once
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reuse or create instance once
    chartRef.current = echarts.getInstanceByDom(el) || echarts.init(el)

    // ResizeObserver to keep width responsive
    if ('ResizeObserver' in window) {
      roRef.current = new ResizeObserver(() => {
        try { chartRef.current?.resize() } catch {}
      })
      roRef.current.observe(el)
    } else {
      const handle = () => chartRef.current?.resize()
      window.addEventListener('resize', handle)
      roRef.current = { disconnect: () => window.removeEventListener('resize', handle) }
    }

    return () => {
      // Cleanup on unmount
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      roRef.current?.disconnect?.()
      try { chartRef.current?.dispose?.() } catch {}
      chartRef.current = null
    }
  }, [])

  // Set/update options when data changes
  useEffect(() => {
    const chart = chartRef.current
    const el = ref.current
    if (!chart || !el) return

    // Centrar el zoom inicial en la fecha de inicio
    const sliderStartTs = START_TS
    const lastRowTs = (datasetSource && datasetSource.length) ? Number(datasetSource[datasetSource.length - 1]?.date) : sliderStartTs
    const sliderEndTs = lastRowTs

    // Eje Y primario: USDT, mínimo cercano a la cartera inicial y salto de 100
    const INIT = Number(settings.initialPortfolio) || 0
    const Y_MIN = Math.max(0, Math.floor(INIT / 100) * 100)
    const Y_INTERVAL = 100

    const option = {
      legend: { top: 8, textStyle: { color: '#cbd5e1' } },
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params) => {
          if (!params || !params.length) return ''
          const ts = params[0].axisValue
          const date = new Date(Number(ts)).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const lines = [date]
          for (const p of params) {
            const val = (p.data?.[p.encode?.y?.[0]] ?? p.value?.[1] ?? p.data?.value ?? p.data?.y ?? p.value)
            const v = (typeof p.data === 'object' && p.data && 'forecast' in p.data) ? (p.seriesName === 'Pronóstico' ? p.data.forecast : p.data.real) : p.value
            const shown = Number(v)
            if (isFinite(shown)) lines.push(`${p.marker} ${p.seriesName}: ${shown} USDT`)
          }
          return lines.join('<br/>')
        }
      },
      grid: { left: 48, right: 8, top: 44, bottom: 64, containLabel: false },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        // No mostrar fechas anteriores a la fecha de inicio
        min: START_TS,
        minInterval: 24 * 3600 * 1000, // ticks diarios
        axisLabel: {
          formatter: (val) => new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          hideOverlap: true,
          margin: 8,
          alignMinLabel: true,
          alignMaxLabel: true,
        },
      },
      yAxis: [
        {
          type: 'value',
          position: 'left',
          min: Y_MIN,
          interval: Y_INTERVAL,
          axisLabel: { formatter: (val) => `${val} USDT`, inside: false, margin: 12, fontSize: 11 },
          axisLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.55)' } },
          axisTick: { show: false },
          splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.35)', type: 'solid', width: 1 } }
        }
      ],
      dataZoom: [
        { type: 'slider', startValue: sliderStartTs, endValue: sliderEndTs },
        { type: 'inside' }
      ],
      dataset: [
        { id: 'raw', dimensions: [ { name: 'date', type: 'time' }, 'forecast', 'real' ], source: datasetSource },
        { id: 'filtered', fromDatasetId: 'raw', transform: { type: 'filter', config: { and: [ { dimension: 'date', gte: START_TS } ] } } },
      ],
      series: [
        {
          name: 'Pronóstico',
          type: 'line',
          smooth: true,
          datasetId: 'filtered',
          encode: { x: 'date', y: 'forecast' },
          lineStyle: { color: '#3b82f6', width: 2 },
          showSymbol: false,
          yAxisIndex: 0,
        },
        {
          name: 'Cartera real',
          type: 'line',
          smooth: true,
          datasetId: 'filtered',
          encode: { x: 'date', y: 'real' },
          lineStyle: { color: '#16a34a', width: 2 },
          showSymbol: false,
          yAxisIndex: 0,
          connectNulls: true,
        },
      ],
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    // Debug breve
    try {
      // eslint-disable-next-line no-console
      const realPoints = (datasetSource || []).filter(r => r && r.real != null)
      const lastReal = realPoints.length ? realPoints[realPoints.length - 1] : null
      const lastRealDate = lastReal ? new Date(Number(lastReal.date)).toISOString().slice(0,10) : '—'
      console.debug('[Chart]', { startISO, lastRealDate, rows: datasetSource?.length, sample: datasetSource?.slice(0, 3) })
    } catch {}

    rafRef.current = requestAnimationFrame(() => {
      try { chart.setOption(option) } catch {}
    })
  }, [categories, datasetSource, startISO])

  return (
    <Box>
      <Heading size="lg" mb={4}>Gráfica</Heading>
      <Box className="card-modern" p={0}>
        <Box className="chart-scroll">
          <Box ref={ref} className="chart-host" />
        </Box>
      </Box>
    </Box>
  )
}
