// Netlify Function: load-backup
// Devuelve un backup JSON desde Netlify Blobs. Por defecto 'latest.json' o una clave específica con ?key=
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
    if (event.httpMethod !== 'GET') {
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

    const key = (event.queryStringParameters && event.queryStringParameters.key) || 'latest.json'
    const store = getStore({ name: 'plantsq2-backups' })

    const content = await store.get(key)
    if (!content) {
      return { statusCode: 404, headers: corsHeaders, body: 'Not Found' }
    }

    // content puede ser string o ArrayBuffer; @netlify/blobs retorna string por defecto
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: typeof content === 'string' ? content : JSON.stringify(content)
    }
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders, body: 'Internal Server Error' }
  }
}
