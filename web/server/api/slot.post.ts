import type { H3Event } from 'h3'
import { relayFromBody } from '../utils/relayApi'
import type { RelayCommand } from '../types/Relay'

interface SlotColorBody {
  slot: string
  r: number
  g: number
  b: number
}

/** Relay a solid colour to one RGB slot on the paired desktop. */
export default defineEventHandler(async (event: H3Event) => {
  return relayFromBody<SlotColorBody>(event, (body: SlotColorBody): RelayCommand | null => {
    if (!body?.slot || typeof body.r !== 'number' || typeof body.g !== 'number' || typeof body.b !== 'number') {
      return null
    }
    return { type: 'slot', slot: body.slot, r: body.r, g: body.g, b: body.b }
  })
})
