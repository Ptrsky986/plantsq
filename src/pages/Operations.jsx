import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Tag, HStack, Button, Select, Text, Input } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { jsPDF } from 'jspdf'

const SIGNAL_NAMES = ['Señal 1', 'Señal 2', 'Señal 3', 'Señal 4']

export default function Operations() {
  const { days, addWithdrawal, clearWithdrawal } = useAppStore()
  const [monthFilter, setMonthFilter] = useState('') // format: YYYY-MM
  const [wDate, setWDate] = useState('')
  const [wAmount, setWAmount] = useState('')

  const rows = useMemo(() => {
    const entries = Object.entries(days).sort(([a], [b]) => (a < b ? -1 : 1))
    const list = []
    for (const [date, data] of entries) {
      if (monthFilter && !date.startsWith(monthFilter)) continue
      const signals = data?.signals || []
      signals.forEach((val, idx) => {
        if (val === 0) return
        list.push({ date, signal: SIGNAL_NAMES[idx] || `Señal ${idx + 1}`, result: Number(val) || 0, dailySum: Number(data?.dailySum) || 0 })
      })
      // Fila de retirada si aplica
      const wd = Number(data?.withdrawal) || 0
      if (wd > 0) {
        list.push({ date, signal: 'Retirada', result: -wd, dailySum: Number(data?.dailySum) || 0 })
      }
      // Si no hubo señales ni retirada, mostrar placeholder
      const hasNonZeroSignal = signals.some(v => Number(v) !== 0)
      if (!hasNonZeroSignal && wd <= 0) {
        list.push({ date, signal: '—', result: 0, dailySum: Number(data?.dailySum) || 0 })
      }
    }
    return list
  }, [days, monthFilter])

  const months = useMemo(() => {
    const set = new Set()
    Object.keys(days).forEach(d => set.add(d.slice(0, 7)))
    return Array.from(set).sort()
  }, [days])

  const summary = useMemo(() => {
    // KPIs por filtro de mes
    const entries = Object.entries(days).filter(([d]) => !monthFilter || d.startsWith(monthFilter))
    let totalPL = 0 // señales
    let totalWD = 0 // retiros
    let pos = 0
    let neg = 0
    entries.forEach(([_, data]) => {
      const s = Number(data?.dailySum) || 0
      totalPL += s
      totalWD += Number(data?.withdrawal) || 0
      if (s > 0) pos += 1
      if (s < 0) neg += 1
    })
    const net = totalPL - totalWD
    return { daysCount: entries.length, totalPL, totalWD, net, pos, neg }
  }, [days, monthFilter])

  const exportPDF = () => {
    const doc = new jsPDF()
    let y = 14
    doc.setFontSize(14)
    doc.text('Operaciones', 14, y)
    y += 8
    doc.setFontSize(10)
    if (monthFilter) { doc.text(`Mes: ${monthFilter}`, 14, y); y += 6 }
    doc.text(`Total filas: ${rows.length}`, 14, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha', 14, y)
    doc.text('Señal', 60, y)
    doc.text('Resultado (USDT)', 110, y)
    doc.text('Suma Día', 160, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    rows.forEach(r => {
      if (y > 280) { doc.addPage(); y = 14 }
      doc.text(String(r.date), 14, y)
      doc.text(String(r.signal), 60, y)
      doc.text(String(r.result.toFixed(2)), 110, y, { align: 'left' })
      doc.text(String(r.dailySum.toFixed(2)), 160, y, { align: 'left' })
      y += 6
    })
    // Resumen
    if (y > 260) { doc.addPage(); y = 14 }
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen', 14, y); y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`P/L señales: ${summary.totalPL.toFixed(2)} USDT`, 14, y); y += 6
    doc.text(`Retiros: ${summary.totalWD.toFixed(2)} USDT`, 14, y); y += 6
    doc.text(`Neto: ${(summary.net).toFixed(2)} USDT`, 14, y); y += 6
    doc.save(`operaciones${monthFilter ? '-' + monthFilter : ''}.pdf`)
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>Operaciones</Heading>
      <HStack mb={3} gap={3} align="center">
        <Select placeholder="Filtrar por mes" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} maxW="220px" bg="white">
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
        <Button onClick={() => setMonthFilter('')}>Limpiar filtro</Button>
        <Button colorScheme="teal" onClick={exportPDF}>Exportar PDF</Button>
      </HStack>

      {/* Formulario de retiradas */}
      <Box className="card-modern" p={3} mb={4}>
        <HStack gap={3} align="end" flexWrap="wrap">
          <Box>
            <Text className="kpi-title" mb={1}>Fecha de retirada</Text>
            <Input type="date" className="input-modern" value={wDate} onChange={(e) => setWDate(e.target.value)} maxW="220px" />
          </Box>
          <Box>
            <Text className="kpi-title" mb={1}>Cantidad (USDT)</Text>
            <Input type="number" className="input-modern" placeholder="0" value={wAmount} onChange={(e) => setWAmount(e.target.value)} maxW="220px" />
          </Box>
          <HStack gap={2}>
            <Button colorScheme="red" onClick={() => { if (wDate) { addWithdrawal(wDate, Number(wAmount)); } }}>Añadir retiro</Button>
            <Button onClick={() => { if (wDate) { clearWithdrawal(wDate); } }}>Borrar retiro del día</Button>
          </HStack>
        </HStack>
      </Box>

      {/* KPIs */}
      <Box className="kpi-grid" mb={4}>
        <Box className="kpi-card">
          <Text className="kpi-title">Días en rango</Text>
          <Text className="kpi-value">{summary.daysCount}</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">P/L total</Text>
          <Text className="kpi-value" style={{ color: summary.totalPL >= 0 ? '#16a34a' : '#dc2626' }}>{summary.totalPL.toFixed(2)} USDT</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">Retiros totales</Text>
          <Text className="kpi-value" style={{ color: '#dc2626' }}>-{summary.totalWD.toFixed(2)} USDT</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">Variación neta</Text>
          <Text className="kpi-value" style={{ color: summary.net >= 0 ? '#16a34a' : '#dc2626' }}>{summary.net.toFixed(2)} USDT</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">Días + / -</Text>
          <Text className="kpi-value">{summary.pos} / {summary.neg}</Text>
        </Box>
      </Box>

      <Box className="card-modern" p={2}>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th>Señal</Th>
              <Th isNumeric>Resultado (USDT)</Th>
              <Th isNumeric>Suma Día</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.length === 0 ? (
              <Tr>
                <Td colSpan={4}><Text color="gray.500">Sin operaciones</Text></Td>
              </Tr>
            ) : rows.map((r, i) => (
              <Tr key={i}>
                <Td>{r.date}</Td>
                <Td>{r.signal !== '—' ? <Tag colorScheme={r.signal === 'Retirada' ? 'red' : 'teal'}>{r.signal}</Tag> : '—'}</Td>
                <Td isNumeric>{r.result.toFixed(2)}</Td>
                <Td isNumeric>{r.dailySum.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
}
