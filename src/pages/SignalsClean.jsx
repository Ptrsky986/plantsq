import { Box, Heading, Text, SimpleGrid, Button, Badge, HStack, Input } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import useAppStore from '../store/useAppStore'
import { format, addDays, parseISO } from 'date-fns'
import { useEffect } from 'react'

export default function SignalsClean() {
  const { settings, days, historyLastValue, thirdSignal, activateThirdSignal, deactivateThirdSignal, daysRemainingThird, saveDay, clearDay } = useAppStore()

  const todayISO = format(new Date(), 'yyyy-MM-dd')
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      date: todayISO,
      s1: '', s2: '', s3: '', s4: ''
    }
  })

  // Normaliza números en formato europeo (punto miles, coma decimal)
  const toNumberEU = (s) => {
    if (typeof s !== 'string') return Number(s) || 0
    if (s.trim() === '') return 0
    if (s.includes(',')) {
      const n = s.replace(/\./g, '').replace(',', '.')
      return parseFloat(n) || 0
    }
    return parseFloat(s) || 0
  }

  const onClear = () => {
    const date = watch('date')
    clearDay(date)
    reset({ date, s1: '', s2: '', s3: '', s4: '' })
  }

  // Señal 3: activable por 5 días. La 4 funciona como 1 y 2.

  const onSubmit = (data) => {
    const dateISO = data.date
    const r1 = toNumberEU(data.s1)
    const r2 = toNumberEU(data.s2)
    const r3 = thirdSignal.active ? toNumberEU(data.s3) : 0
    const r4 = toNumberEU(data.s4)
    saveDay(dateISO, [r1, r2, r3, r4])
    console.info(`Día guardado: ${dateISO}`)
    // Avanzar automáticamente la fecha y precargar valores si existen
    const nextISO = format(addDays(parseISO(dateISO), 1), 'yyyy-MM-dd')
    const nextEntry = days[nextISO]
    const toField = (v) => (v === undefined || v === null ? '' : String(v))
    reset({
      date: nextISO,
      s1: toField(nextEntry?.signals?.[0]),
      s2: toField(nextEntry?.signals?.[1]),
      s3: toField(nextEntry?.signals?.[2]),
      s4: toField(nextEntry?.signals?.[3]),
    })
  }

  const selectedDate = watch('date')
  const remaining = daysRemainingThird(selectedDate)
  const dayPL = days[selectedDate]?.dailySum ?? 0
  const dayPLDisplay = Math.abs(dayPL) < 1e-9 ? 0 : dayPL
  const portfolioNow = historyLastValue()

  // Precargar resultados guardados al cambiar de fecha
  useEffect(() => {
    if (!selectedDate) return
    const entry = days[selectedDate]
    const toField = (v) => (v === undefined || v === null ? '' : String(v))
    if (entry && Array.isArray(entry.signals)) {
      reset({
        date: selectedDate,
        s1: toField(entry.signals[0]),
        s2: toField(entry.signals[1]),
        s3: toField(entry.signals[2]),
        s4: toField(entry.signals[3]),
      })
    } else {
      reset({ date: selectedDate, s1: '', s2: '', s3: '', s4: '' })
    }
  }, [selectedDate, days, reset])

  return (
    <Box>
      <Heading size="lg" mb={1}>Señales</Heading>
      <Text mb={4} className="muted">Inicio: <b>{settings.startDate || '—'}</b> · Cartera inicial: <b>{settings.initialPortfolio} USDT</b></Text>

      {/* KPIs */}
      <Box className="kpi-grid" mb={4}>
        <Box className="kpi-card">
          <Text className="kpi-title">Valor actual</Text>
          <Text className="kpi-value">{portfolioNow.toFixed(2)} USDT</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">Resultados del Día</Text>
          <Text className="kpi-value" style={{ color: dayPLDisplay >= 0 ? '#16a34a' : '#dc2626' }}>{dayPLDisplay.toFixed(2)} USDT</Text>
        </Box>
        <Box className="kpi-card">
          <Text className="kpi-title">Señal 3</Text>
          <Text className="kpi-value">{thirdSignal.active ? `Activa · ${Math.max(0, remaining)}d` : 'Inactiva'}</Text>
        </Box>
      </Box>

      {/* Contenedor de señales (claro) */}
      <Box className="card-container" p={4}>
        <Box className="field-narrow" mb={4}>
          <Text mb={1} fontSize="sm" className="muted">Fecha</Text>
          <Input className="input-modern" type="date" {...register('date')} />
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <SimpleGrid className="signals-grid signals-fixed-2" columns={2} gap={6}>
            {['Señal 1', 'Señal 2', 'Señal 3', 'Señal 4'].map((label, idx) => {
              const val = watch(`s${idx + 1}`)
              return (
                <Box key={label} p={3} className="card-modern signal-card">
                  <HStack justify="space-between" mb={2}>
                    <Heading size="sm">{label}</Heading>
                    {/* Se elimina el badge 'Activa · Xd' del encabezado de Señal 3 */}
                  </HStack>
                  <Input
                    className="input-modern"
                    type="number"
                    step="0.01"
                    placeholder="Resultado USDT"
                    key={idx === 2 ? (thirdSignal.active ? 's3-on' : 's3-off') : `s${idx+1}`}
                    isDisabled={idx === 2 && !thirdSignal.active}
                    {...register(`s${idx + 1}`)}
                  />
                  <Text mt={2} className="muted" fontSize="sm">{val === '' ? 'Sin dato' : 'Listo para guardar'}</Text>
                  {idx === 2 && (
                    <HStack mt={3} spacing={3}>
                      {!thirdSignal.active ? (
                        <Button type="button" className="btn-primary" onClick={() => activateThirdSignal(selectedDate)}>Activar Señal 3</Button>
                      ) : (
                        <Button type="button" className="btn-ghost" onClick={() => deactivateThirdSignal()}>Desactivar</Button>
                      )}
                      <Badge className="badge-modern badge-neutral" title="Días restantes">
                        Días: {Math.max(0, remaining)}
                      </Badge>
                    </HStack>
                  )}
                </Box>
              )
            })}
          </SimpleGrid>

          <HStack mt={6} spacing={3}>
            <Button className="btn-primary" type="submit">Guardar día</Button>
            <Button className="btn-ghost" onClick={onClear}>Limpiar</Button>
          </HStack>
        </form>
      </Box>
    </Box>
  )
}
