import axios from 'axios'
import { getToken } from '../auth'

const client = axios.create({
  baseURL: 'https://discalculia-app.onrender.com',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach token if present
client.interceptors.request.use((config) => {
  const token = getToken()
  if(token){
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401 clear token and redirect to login
client.interceptors.response.use(
  res => res,
  err => {
    const status = err?.response?.status
    if(status === 401){
      try{
        localStorage.removeItem('nc_token')
        localStorage.removeItem('nc_user')
        // redirect to login to prompt re-auth
        window.location = '/login'
      }catch(e){}
    }
    return Promise.reject(err)
  }
)

export default client
