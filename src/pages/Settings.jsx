import { Box, Heading, Input, Button, VStack, Text, HStack, Divider } from '@chakra-ui/react'
import useAppStore from '../store/useAppStore'

export default function Settings() {
  const {
    settings,
    setStartDate,
    setInitialPortfolio,
    setForecastWindow,
    exportState,
    importState,
  } = useAppStore()

  const onSave = () => {
    console.info('Ajustes guardados')
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>Ajustes</Heading>
      <Box className="card-modern" p={4} maxW="640px">
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

          {/* Se eliminó la sección de "Señal 3 (periodo activo)" del menú Ajustes */}

          <Button className="btn-primary" onClick={onSave}>Guardar</Button>

          <Divider my={2} />

          <Box>
            <Heading size="md" mb={2}>Datos (Exportar / Importar)</Heading>
            <Text mb={3} className="muted">Usa estas acciones para respaldar o migrar tus datos entre entornos.</Text>
            <HStack gap={3} flexWrap="wrap">
              <Button
                className="btn-secondary"
                onClick={() => {
                  try {
                    const data = exportState()
                    const json = JSON.stringify(data, null, 2)
                    const blob = new Blob([json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `plantsq2-backup-${ts}.json`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  } catch (e) {
                    console.error('Error al exportar', e)
                    alert('Error al exportar datos')
                  }
                }}
              >Exportar JSON</Button>

              <Button
                className="btn-outline"
                onClick={() => {
                  const input = document.getElementById('plantsq2-import-file')
                  if (input) input.click()
                }}
              >Importar JSON</Button>
              <input
                id="plantsq2-import-file"
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    importState(text)
                    alert('Importación completada. Recarga si no ves los cambios de inmediato.')
                  } catch (err) {
                    console.error('Error al importar', err)
                    alert('Error al importar JSON')
                  } finally {
                    e.target.value = ''
                  }
                }}
              />
            </HStack>
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}
