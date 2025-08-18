import { Box, Heading, Input, Button, VStack, Text } from '@chakra-ui/react'
import useAppStore from '../store/useAppStore'

export default function Settings() {
  const { settings, setStartDate, setInitialPortfolio, setForecastWindow } = useAppStore()

  const onSave = () => {
    console.info('Ajustes guardados')
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>Ajustes</Heading>
      <Box className="card-modern" p={4} maxW="420px">
        <VStack align="stretch" gap={4}>
          <Box>
            <Text mb={1} fontSize="sm" className="muted">Fecha de inicio</Text>
            <Input className="input-modern" type="date" value={settings.startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
          </Box>

          <Box>
            <Text mb={1} fontSize="sm" className="muted">Cartera inicial (USDT)</Text>
            <Input className="input-modern" type="number" step="1" value={settings.initialPortfolio} onChange={(e) => setInitialPortfolio(e.target.value)} />
          </Box>

          <Box>
            <Text mb={1} fontSize="sm" className="muted">Ventana de pronóstico (días)</Text>
            <Input className="input-modern" type="number" min="1" value={settings.forecastWindow} onChange={(e) => setForecastWindow(e.target.value)} />
          </Box>

          <Button className="btn-primary" onClick={onSave}>Guardar</Button>
        </VStack>
      </Box>
    </Box>
  )
}
