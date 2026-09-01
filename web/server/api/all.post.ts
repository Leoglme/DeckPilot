import type { H3Event } from 'h3'
import { relayFromBody } from '../utils/relayApi'
import type { RelayCommand } from '../types/Relay'

interface AllColorBody {
  r: number
  g: number
  b: number
}

/** Relay a solid colour to every RGB slot on the paired desktop. */
export default defineEventHandler(async (event: H3Event) => {
  return relayFromBody<AllColorBody>(event, (body: AllColorBody): RelayCommand | null => {
    if (typeof body?.r !== 'number' || typeof body?.g !== 'number' || typeof body?.b !== 'number') {
      return null
    }
    return { type: 'all', r: body.r, g: body.g, b: body.b }
  })
})
