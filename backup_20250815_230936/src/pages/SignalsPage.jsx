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

  const onClear = () => {
    reset({ date: watch('date'), s1: '', s2: '', s3: '', s4: '' })
  }

  const onSubmit = (data) => {
    const dateISO = data.date
    const r1 = parseFloat(data.s1) || 0
    const r2 = parseFloat(data.s2) || 0
    const r3 = thirdSignal.active ? (parseFloat(data.s3) || 0) : 0
    const r4 = parseFloat(data.s4) || 0
    saveDay(dateISO, [r1, r2, r3, r4])
    console.info(`Día guardado: ${dateISO}`)
    onClear()
  }

  const remaining = daysRemainingThird()

  return (
    <Box>
      <Heading size="lg" mb={1}>Señales</Heading>
      <Text mb={4} color="gray.600">Cartera inicial: <b>{settings.initialPortfolio} USDT</b> · Inicio: <b>{settings.startDate || '—'}</b></Text>

      <Box maxW="260px" mb={4}>
        <Text mb={1} fontSize="sm" color="gray.600">Fecha</Text>
        <Input type="date" {...register('date')} onChange={(e) => setValue('date', e.target.value)} />
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <SimpleGrid columns={[1, 2]} gap={4}>
          {['Señal 1', 'Señal 2', 'Señal 3', 'Señal 4'].map((label, idx) => (
            <Box key={label} p={4} border="1px solid" borderColor="gray.200" rounded="lg" bg="white">
              <HStack justify="space-between" mb={2}>
                <Heading size="sm">{label}</Heading>
                {idx === 2 ? <Badge className="badge-modern">{thirdSignal.active ? `Activa · ${Math.max(0, remaining)}d` : 'Opcional'}</Badge> : null}
              </HStack>
              <Input type="number" step="0.01" placeholder="Resultado USDT" {...register(`s${idx + 1}`)} isDisabled={idx === 2 && !thirdSignal.active} />
              {idx === 2 && (
                <HStack mt={3} spacing={3}>
                  {!thirdSignal.active ? (
                    <Button colorScheme="purple" onClick={(e) => { e.preventDefault(); activateThirdSignal(watch('date')) }}>Activar Señal 3</Button>
                  ) : (
                    <Button variant="outline" onClick={(e) => { e.preventDefault(); deactivateThirdSignal() }}>Desactivar</Button>
                  )}
                  <Badge className="badge-modern" title="Días restantes">Días: {Math.max(0, remaining)}</Badge>
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
