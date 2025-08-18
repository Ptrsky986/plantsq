import { Box, Heading, Text, SimpleGrid, Button, Badge, HStack, Input } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import useAppStore from '../store/useAppStore'
import { format } from 'date-fns'

export default function Signals() {
  const { settings, thirdSignal, activateThirdSignal, deactivateThirdSignal, daysRemainingThird, saveDay } = useAppStore()

  const todayISO = format(new Date(), 'yyyy-MM-dd')
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      date: todayISO,
      s1: '', s2: '', s3: '', s4: ''
    }
  })

  // Normaliza números en formato europeo: "1.234,56" -> 1234.56
  const toNumberEU = (s) => {
    if (s == null) return 0
    const raw = String(s).trim()
    if (raw === '') return 0
    if (raw.includes(',')) {
      // Si hay coma, tratamos los puntos como separador de miles
      return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0
    }
    // Sin coma, dejamos comportamiento estándar (punto como decimal)
    return parseFloat(raw) || 0
  }

  const onClear = () => {
    reset({ date: watch('date'), s1: '', s2: '', s3: '', s4: '' })
  }

  const onSubmit = (data) => {
    const dateISO = data.date
    const r1 = toNumberEU(data.s1)
    const r2 = toNumberEU(data.s2)
    const r3 = thirdSignal.active ? toNumberEU(data.s3) : 0
    const r4 = toNumberEU(data.s4)
    saveDay(dateISO, [r1, r2, r3, r4])
    console.info(`Día guardado: ${dateISO}`)
    onClear()
  }

  const remaining = daysRemainingThird(watch('date'))

  return (
    <Box>
      <Heading size="lg" mb={1}>Señales</Heading>
      <Text mb={4} color="gray.600">Cartera inicial: <b>{settings.initialPortfolio} USDT</b> · Inicio: <b>{settings.startDate || '—'}</b></Text>

      <Box maxW="260px" mb={4}>
        <Text mb={1} fontSize="sm" color="gray.600">Fecha</Text>
        <Input type="date" {...register('date')} onChange={(e) => setValue('date', e.target.value)} />
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <SimpleGrid className="signals-grid" columns={[1, 2]} gap={7}>
          {['Señal 1', 'Señal 2', 'Señal 3', 'Señal 4'].map((label, idx) => (
            <Box key={label} className="card-modern signal-card">
              <HStack justify="space-between" mb={2}>
                <Heading size="sm">{label}</Heading>
                {/* Se retira el badge 'Activa · Xd'/'Opcional' para Señal 3 */}
              </HStack>
              <Input className="input-modern" type="number" step="0.01" placeholder="Resultado USDT" {...register(`s${idx + 1}`)} isDisabled={idx === 2 && !thirdSignal.active} />
              {idx === 2 && (
                <HStack mt={3} spacing={3}>
                  {!thirdSignal.active ? (
                    <Button type="button" className="btn-primary" onClick={() => activateThirdSignal(watch('date'))}>Activar Señal 3</Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => deactivateThirdSignal()}>Desactivar</Button>
                  )}
                  <Badge className="badge-modern badge-neutral" title="Días restantes">Días: {Math.max(0, remaining)}</Badge>
                </HStack>
              )}
            </Box>
          ))}
        </SimpleGrid>

        <HStack mt={6} spacing={3}>
          <Button colorScheme="teal" type="submit">Guardar día</Button>
          <Button variant="outline" onClick={onClear}>Limpiar</Button>
        </HStack>
      </form>
    </Box>
  )
}
