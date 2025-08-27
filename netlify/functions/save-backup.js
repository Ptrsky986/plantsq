// deploy: force rebuild 2025-08-27T19:02:20Z
// Netlify Function: save-backup
// Guarda un backup JSON en Netlify Blobs. Mantiene una copia versionada y una 'latest'.
import { getStore } from '@netlify/blobs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Backup-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: '' }
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
    }

    // Seguridad simple: si NETLIFY_BACKUP_TOKEN está configurado, exigir header x-backup-token
    const requiredToken = process.env.NETLIFY_BACKUP_TOKEN
    if (requiredToken) {
      const provided = event.headers['x-backup-token'] || event.headers['X-Backup-Token'] || event.headers['x-backup-token']
      if (!provided || provided !== requiredToken) {
        return { statusCode: 401, headers: corsHeaders, body: 'Unauthorized' }
      }
    }

    const body = event.body || ''
    let payload
    try {
      payload = typeof body === 'string' ? JSON.parse(body) : body
    } catch (e) {
      return { statusCode: 400, headers: corsHeaders, body: 'Invalid JSON' }
    }

    // Validación mínima de esquema
    const data = payload && payload.days && payload.settings ? payload : { ...payload, days: payload?.days || {}, settings: payload?.settings || {} }

    // Blobs: usar contexto automático de Netlify si existe; de lo contrario permitir configuración manual
    const opts = { name: 'plantsq2-backups' }
    const manualSiteId = process.env.NETLIFY_BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || process.env.SITE_ID
    const manualToken = process.env.NETLIFY_BLOBS_TOKEN
    if (manualSiteId && manualToken) {
      opts.siteID = manualSiteId
      opts.token = manualToken
    }
    const store = getStore(opts)
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const versionKey = `backup-${ts}.json`

    const json = JSON.stringify({ ...data, savedAt: new Date().toISOString() })

    await store.set(versionKey, json, { contentType: 'application/json' })
    await store.set('latest.json', json, { contentType: 'application/json' })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ ok: true, key: versionKey })
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Internal Server Error', message: e?.message || String(e) })
    }
  }
}
