import { Box, Heading } from '@chakra-ui/react'
import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import useAppStore from '../store/useAppStore'
import { addDays, format, parseISO, isAfter } from 'date-fns'

export default function Chart() {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const rafRef = useRef(0)
  const roRef = useRef(null)
  const { settings, days, thirdSignal } = useAppStore()

  const START_ISO = '2025-07-01'
  const HORIZON_DAYS = 365 // meses siguientes con scroll
  const START_TS = +new Date(START_ISO)
  const END_JUL_ISO = '2025-07-31'
  const END_JUL_TS = +new Date(END_JUL_ISO)

  const { categories, datasetSource } = useMemo(() => {
    // 1) Eje X: días desde 2025-07-01 en adelante
    const start = parseISO(START_ISO)
    const categories = []
    for (let i = 0; i < HORIZON_DAYS; i++) {
      categories.push(format(addDays(start, i), 'yyyy-MM-dd'))
    }

    // 2) Serie verde: suma diaria (0 cuando no hay dato)
    const dailyByDay = {}
    for (const d of categories) {
      dailyByDay[d] = Number(days[d]?.dailySum || 0)
    }

    // 3) Serie azul: pronóstico solo desde el día posterior al último real, usando cartera base
    const nSignals = 3 + (thirdSignal?.active ? 1 : 0)
    // Composición por señal: cada señal incrementa 0.58% sucesivamente
    const dailyMultiplier = Math.pow(1 + 0.0058, nSignals)
    const realDates = Object.keys(days).sort()
    const lastRealISO = realDates.length ? realDates[realDates.length - 1] : null
    let base = lastRealISO ? (days[lastRealISO]?.portfolioAfter ?? (Number(settings.initialPortfolio) || 0)) : (Number(settings.initialPortfolio) || 0)
    const forecastByDay = {}
    for (const d of categories) {
      if (!lastRealISO || isAfter(parseISO(d), parseISO(lastRealISO))) {
        base = Number((base * dailyMultiplier).toFixed(2))
        forecastByDay[d] = base
      } else {
        forecastByDay[d] = null
      }
    }

    // 4) Dataset estilo ejemplo (array de objetos + dimensions explícitas)
    //    "date" en timestamp numérico para compatibilidad con filtros (gte/lt requieren número)
    const source = []
    for (const d of categories) {
      source.push({ date: +new Date(d), daily: dailyByDay[d], forecast: forecastByDay[d] ?? null })
    }

    return { categories, datasetSource: source }
  }, [days, settings.initialPortfolio, thirdSignal?.active])

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

    const option = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => v == null ? '' : `${v} USDT`,
        confine: true,
      },
      grid: { left: 0, right: 0, top: 44, bottom: 64, containLabel: false },
      xAxis: {
        type: 'time',
        boundaryGap: false,
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
          name: '',
          position: 'left',
          min: 1000,
          axisLabel: { formatter: '{value} USDT', inside: true, margin: 12, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } }
        },
        {
          type: 'value',
          name: 'Resultado diario',
          position: 'right',
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'slider', startValue: START_TS, endValue: END_JUL_TS },
        { type: 'inside' }
      ],
      dataset: [
        { id: 'raw', dimensions: [ { name: 'date', type: 'time' }, 'daily', 'forecast' ], source: datasetSource },
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
          emphasis: { focus: 'series' },
          showSymbol: false,
          yAxisIndex: 0,
        },
        {
          name: 'Suma diaria (Señales)',
          type: 'line',
          smooth: true,
          datasetId: 'filtered',
          encode: { x: 'date', y: 'daily' },
          lineStyle: { color: '#16a34a', width: 2 },
          areaStyle: { opacity: 0.06, color: '#16a34a' },
          showSymbol: false,
          yAxisIndex: 1,
        },
      ],
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      try { chart.setOption(option) } catch {}
    })
  }, [categories, datasetSource])

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
