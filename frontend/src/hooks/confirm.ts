// src/utils/confirm.ts

export function confirm(type: 'withdraw' | 'deposit') {
  localStorage.setItem(`confirmed_${type}`, 'true')
}

export function hasConfirmed(type: 'withdraw' | 'deposit') {
  return localStorage.getItem(`confirmed_${type}`) === 'true'
}
