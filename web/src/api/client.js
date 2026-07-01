import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL || !/^https?:\/\//.test(API_BASE_URL)) {
  console.error(
    `VITE_API_BASE_URL is missing or malformed: "${API_BASE_URL}". ` +
    `It must start with http:// or https:// or every API call will silently fail.`
  )
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (config.method === 'get') {
    config.params = { ...config.params, _: Date.now() }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error(
        `Network error — could not reach ${API_BASE_URL}. Is the Railway ` +
        `backend awake, and is CORS configured for this origin?`
      )
    } else {
      console.error(
        `API error ${error.response.status} on ${error.config?.url}:`,
        error.response.data
      )
    }
    return Promise.reject(error)
  }
)

export default apiClient

export const unwrapList = (data) => (Array.isArray(data) ? data : data?.results || [])

export const devicesApi = {
  list: () => apiClient.get('/api/devices/'),
}

export const sensorsApi = {
  latest: (deviceId) =>
    apiClient.get('/api/sensors/latest/', { params: deviceId ? { device: deviceId } : {} }),
  history: (sensorType, params = {}) =>
    apiClient.get('/api/sensors/history/', { params: { sensor_type: sensorType, ...params } }),
}

export const commandsApi = {
  send: (device, action, payload = {}) =>
    apiClient.post('/api/commands/send/', { device, action, payload }),
  pending: (deviceId) =>
    apiClient.get('/api/commands/pending/', { params: deviceId ? { device: deviceId } : {} }),
}

export const accessApi = {
  verify: (method, value) =>
    apiClient.post('/api/access/verify/',
      method === 'rfid' ? { method, rfid_uid: value } : { method, pin: value }
    ),
  log: () => apiClient.get('/api/access/log/'),
}

export const alertsApi = {
  list: (unreadOnly = false) =>
    apiClient.get('/api/alerts/', { params: unreadOnly ? { unread_only: 'true' } : {} }),
  markRead: (alertId) => apiClient.post('/api/alerts/read/', { alert_id: alertId }),
}

export const energyApi = {
  daily: (deviceId) =>
    apiClient.get('/api/energy/daily/', { params: deviceId ? { device: deviceId } : {} }),
}

export const mlApi = {
  status: () => apiClient.get('/api/ml/status/'),
  anomaly: () => apiClient.get('/api/ml/predict/anomaly/'),
  gas: () => apiClient.get('/api/ml/predict/gas/'),
}