import api from './api'

export async function fetchMyReferrals() {
  const res = await api.get('/referrals/me')
  return res.data
}

export default { fetchMyReferrals }
