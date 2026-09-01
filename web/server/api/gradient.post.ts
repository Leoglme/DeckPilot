import type { H3Event } from 'h3'
import { relayFromBody } from '../utils/relayApi'
import type { RelayCommand } from '../types/Relay'

interface GradientBody {
  colors: [number, number, number][]
}

/** Relay a multi-colour ambiance to the paired desktop. */
export default defineEventHandler(async (event: H3Event) => {
  return relayFromBody<GradientBody>(event, (body: GradientBody): RelayCommand | null => {
    if (!Array.isArray(body?.colors) || body.colors.length === 0) {
      return null
    }
    return { type: 'gradient', colors: body.colors }
  })
})
