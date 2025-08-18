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

  const onClear = () => {
    const date = watch('date')
    clearDay(date)
    reset({ date, s1: '', s2: '', s3: '', s4: '' })
  }

  // Señal 3: activable por 5 días. La 4 funciona como 1 y 2.

  const onSubmit = (data) => {
    const dateISO = data.date
    const r1 = parseFloat(data.s1) || 0
    const r2 = parseFloat(data.s2) || 0
    const r3 = thirdSignal.active ? (parseFloat(data.s3) || 0) : 0
    const r4 = parseFloat(data.s4) || 0
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

  const remaining = daysRemainingThird()
  const selectedDate = watch('date')
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
        <Box maxW="260px" mb={4}>
          <Text mb={1} fontSize="sm" className="muted">Fecha</Text>
          <Input className="input-modern" type="date" {...register('date')} />
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <SimpleGrid columns={[1, 2]} gap={4}>
            {['Señal 1', 'Señal 2', 'Señal 3', 'Señal 4'].map((label, idx) => {
              const val = watch(`s${idx + 1}`)
              return (
                <Box key={label} p={4} className="card-modern">
                  <HStack justify="space-between" mb={2}>
                    <Heading size="sm">{label}</Heading>
                    {idx === 2 ? (
                      <Badge
                        className="badge-modern"
                        bg="#0d1117"
                        color="#4338ca"
                        border="1px solid rgba(255,255,255,0.12)"
                        borderRadius="12px"
                        px={2.5}
                        py={1.5}
                      >
                        {thirdSignal.active ? `Activa · ${Math.max(0, remaining)}d` : 'Opcional'}
                      </Badge>
                    ) : null}
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
                        <Button className="btn-primary" onClick={(e) => { e.preventDefault(); activateThirdSignal(selectedDate) }}>Activar Señal 3</Button>
                      ) : (
                        <Button className="btn-ghost" onClick={(e) => { e.preventDefault(); deactivateThirdSignal() }}>Desactivar</Button>
                      )}
                      <Badge
                        className="badge-modern"
                        title="Días restantes"
                        bg="#0d1117"
                        color="#4338ca"
                        border="1px solid rgba(255,255,255,0.12)"
                        borderRadius="12px"
                        px={2.5}
                        py={1.5}
                      >
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
