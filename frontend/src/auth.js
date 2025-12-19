const TOKEN_KEY = 'nc_token'
const USER_KEY = 'nc_user'

export function setToken(token){
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(){
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken(){
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function logout(){
  clearToken()
  try{ window.location = '/' }catch(e){}
}

export function setUser(user){
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(){
  const v = localStorage.getItem(USER_KEY)
  return v ? JSON.parse(v) : null
}

export default {
  setToken, getToken, clearToken, setUser, getUser
}
