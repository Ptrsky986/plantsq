import { Box, Heading, Input, Button, VStack, Text, HStack, Divider, Textarea } from '@chakra-ui/react'
import { useMemo, useState, useEffect } from 'react'
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
  const [cloudToken, setCloudToken] = useState('')
  const [showCloud, setShowCloud] = useState(false)

  // Mostrar bloque de nube solo si existe token en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('plantsq2-cloud-token') || ''
      if (saved) {
        setCloudToken(saved)
        setShowCloud(true)
      } else {
        setShowCloud(false)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const t = (cloudToken || '').trim()
    if (t) {
      try { localStorage.setItem('plantsq2-cloud-token', t) } catch {}
      setShowCloud(true)
    } else {
      try { localStorage.removeItem('plantsq2-cloud-token') } catch {}
      setShowCloud(false)
    }
  }, [cloudToken])

  const diagnostics = useMemo(() => {
    const keys = Object.keys(days || {}).sort()
    const count = keys.length
    const firstDate = count > 0 ? keys[0] : '-'
    const lastDate = count > 0 ? keys[count - 1] : '-'
    const lastValue = typeof historyLastValue === 'function' ? historyLastValue() : 0
    return { count, firstDate, lastDate, lastValue }
  }, [days, historyLastValue])

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

            {showCloud && (
              <>
                <Divider my={4} />
                <Box>
                  <Heading size="md" mb={2}>Copia en la nube (Netlify)</Heading>
                  <Text mb={3} className="muted">Guarda y recupera tus datos en la nube usando funciones serverless. Opcionalmente, indica un token si configuraste seguridad.</Text>
                  <VStack align="stretch" gap={3} maxW="640px">
                    <Box>
                      <Text mb={1} fontSize="sm" className="muted">Token (opcional)</Text>
                      <Input
                        className="input-modern"
                        type="password"
                        placeholder="x-backup-token"
                        value={cloudToken}
                        onChange={(e) => setCloudToken(e.target.value)}
                      />
                    </Box>
                    <HStack gap={3} flexWrap="wrap">
                      <Button
                        className="btn-primary"
                        onClick={async () => {
                          try {
                            const data = exportState()
                            const res = await fetch('https://plantsq.netlify.app/.netlify/functions/save-backup', {
                              method: 'POST',
                              headers: cloudToken.trim() ? {
                                'Content-Type': 'application/json',
                                'X-Backup-Token': cloudToken.trim(),
                              } : { 'Content-Type': 'application/json' },
                              body: JSON.stringify(data),
                            })
                            if (!res.ok) {
                              const txt = await res.text()
                              throw new Error(txt || `HTTP ${res.status}`)
                            }
                            const out = await res.json()
                            alert(`Backup guardado: ${out.key || 'latest.json'}`)
                          } catch (e) {
                            console.error('Error al guardar en la nube', e)
                            alert('Error al guardar en la nube')
                          }
                        }}
                      >Guardar en la nube</Button>

                      <Button
                        className="btn-outline"
                        onClick={async () => {
                          try {
                            const res = await fetch('https://plantsq.netlify.app/.netlify/functions/load-backup', {
                              method: 'GET',
                              headers: cloudToken.trim() ? { 'X-Backup-Token': cloudToken.trim() } : undefined,
                            })
                            if (!res.ok) {
                              const txt = await res.text()
                              throw new Error(txt || `HTTP ${res.status}`)
                            }
                            const json = await res.json()
                            importState(json)
                            alert('Backup cargado desde la nube. Recarga si no ves cambios.')
                          } catch (e) {
                            console.error('Error al cargar desde la nube', e)
                            alert('Error al cargar desde la nube')
                          }
                        }}
                      >Cargar desde la nube (latest)</Button>
                    </HStack>
                  </VStack>
                </Box>
              </>
            )}
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}
