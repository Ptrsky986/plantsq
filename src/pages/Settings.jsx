import { Box, Heading, Input, Button, VStack, Text, HStack, Divider, Textarea } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'

export default function Settings() {
  const {
    settings,
    setStartDate,
    setInitialPortfolio,
    setForecastWindow,
    exportState,
    importState,
    days,
    historyLastValue,
  } = useAppStore()

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [exportTick, setExportTick] = useState(0)

  // Lógica de copia en la nube deshabilitada: se elimina manejo de token

  // Gating de admin: activar con /settings?admin=1, desactivar con ?admin=0
  const isAdmin = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('admin')
      if (q === '1') localStorage.setItem('plantsq_admin', '1')
      if (q === '0') localStorage.removeItem('plantsq_admin')
    } catch {}
    return localStorage.getItem('plantsq_admin') === '1'
  }, [])

  const diagnostics = useMemo(() => {
    const keys = Object.keys(days || {}).sort()
    const count = keys.length
    const firstDate = count > 0 ? keys[0] : '-'
    const lastDate = count > 0 ? keys[count - 1] : '-'
    const lastValue = typeof historyLastValue === 'function' ? historyLastValue() : 0
    return { count, firstDate, lastDate, lastValue }
  }, [days, historyLastValue])

  const exportInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('plantsq_last_export')
      const lastMs = raw ? Number(raw) : 0
      if (!lastMs) return { lastText: 'nunca', daysAgo: Infinity, needsExport: true }
      const now = Date.now()
      const days = Math.floor((now - lastMs) / (1000 * 60 * 60 * 24))
      const date = new Date(lastMs).toLocaleString()
      return { lastText: date, daysAgo: days, needsExport: days >= 7 }
    } catch {
      return { lastText: 'n/a', daysAgo: Infinity, needsExport: true }
    }
  }, [exportTick])

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

          {isAdmin && (
            <>
          <Divider my={2} />

          <Box>
            <Heading size="md" mb={2}>Datos (Exportar / Importar)</Heading>
            <Text mb={3} className="muted">Usa estas acciones para respaldar o migrar tus datos entre entornos.</Text>
            {isAdmin && (
              <Box mb={3} p={2} borderRadius="md" className="muted" style={{ border: '1px dashed #666' }}>
                <Text fontSize="sm">
                  Recordatorio: exporta tu JSON con regularidad.
                  Última exportación: <b>{exportInfo.lastText}</b>
                  {exportInfo.daysAgo !== Infinity ? ` (hace ${exportInfo.daysAgo} días)` : ''}.
                </Text>
              </Box>
            )}
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
                    // Registrar última exportación
                    localStorage.setItem('plantsq_last_export', String(Date.now()))
                    setExportTick((t) => t + 1)
                  } catch (e) {
                    console.error('Error al exportar', e)
                    alert('Error al exportar datos')
                  }
                }}
              >Exportar JSON</Button>

              <Button
                className="btn-outline"
                onClick={async () => {
                  try {
                    const data = exportState()
                    const json = JSON.stringify(data, null, 2)
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(json)
                      alert('JSON copiado al portapapeles')
                    } else {
                      // Fallback
                      const ta = document.createElement('textarea')
                      ta.value = json
                      document.body.appendChild(ta)
                      ta.select()
                      document.execCommand('copy')
                      ta.remove()
                      alert('JSON copiado (método alternativo)')
                    }
                  } catch (e) {
                    console.error('Error al copiar JSON', e)
                    alert('No se pudo copiar al portapapeles')
                  }
                }}
              >Copiar JSON</Button>

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

              <Button
                className="btn-outline"
                onClick={() => setPasteOpen((v) => !v)}
              >Pegar JSON (importar)</Button>
            </HStack>
            {pasteOpen && (
              <Box mt={3}>
                <Text mb={2} className="muted">Pega aquí el JSON exportado (por ejemplo desde producción/Firefox) y pulsa Importar:</Text>
                <Textarea
                  className="input-modern"
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Pega aquí el JSON exportado y pulsa 'Importar desde texto'"
                />
                <HStack mt={2} gap={2}>
                  <Button
                    className="btn-primary"
                    onClick={() => {
                      try {
                        if (!pasteText.trim()) return alert('No hay contenido para importar')
                        importState(pasteText)
                        alert('Importación desde texto completada. Recarga si no ves cambios.')
                        setPasteText('')
                      } catch (e) {
                        console.error('Error al importar desde texto', e)
                        alert('Error al importar desde texto')
                      }
                    }}
                  >Importar desde texto</Button>
                  <Button className="btn-outline" onClick={() => setPasteText('')}>Limpiar</Button>
                </HStack>
              </Box>
            )}

            <Divider my={4} />
            <Box>
              <Heading size="sm" mb={2}>Resumen de datos</Heading>
              <Text className="muted">Días guardados: <b>{diagnostics.count}</b></Text>
              <Text className="muted">Primera fecha: <b>{diagnostics.firstDate}</b></Text>
              <Text className="muted">Última fecha: <b>{diagnostics.lastDate}</b></Text>
              <Text className="muted">Cartera actual: <b>{diagnostics.lastValue}</b></Text>
            </Box>

            </Box>
            </>
          )}
        </VStack>
      </Box>
    </Box>
  )
}
