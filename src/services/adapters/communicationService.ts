// TODO: Replace with real WebSocket/MQTT when backend is ready.
// subscribeToMessages → ws.onmessage + publish via ws.send
// All channel/message logic maps directly to a real radio/messaging API.

import type { DispatchMessage, RadioChannel, Vehicle } from '@/types'
import { messageStore, vehicleStore } from '../mocks/mockStore'
import { generateId, sleep } from '@/lib/utils'

// Realistic auto-response phrases for mock vehicle acknowledgments
const ACK_PHRASES = [
  'Copy that, Command. Wilco.',
  'Acknowledged. Proceeding as directed.',
  'Roger, Command. Understood.',
  'Copy. En route. Out.',
  'Acknowledged. Stand by.',
  'Roger that. Will comply.',
  'Copy. Situation noted. Over.',
  'Understood, Command. Out.',
]

// Inbound status chatter vehicles occasionally send unprompted
const STATUS_CHATTER: Array<{ vehicleId: string; message: string }> = [
  { vehicleId: 'VEH-A-03', message: 'AMB-03 returning to base. Patient delivered to Korle Bu. Unit clear.' },
  { vehicleId: 'VEH-P-03', message: 'POL-03 to Command. Scene secured at Cantonments. Standing by.' },
  { vehicleId: 'VEH-R-02', message: 'RSC-02 en route. ETA 9 minutes to Adabraka flood zone.' },
  { vehicleId: 'VEH-F-06', message: 'FIRE-06 returning. Equipment check needed — pump pressure low.' },
  { vehicleId: 'VEH-A-07', message: 'AMB-07 to Command. Approaching scene now. Requesting police escort.' },
  { vehicleId: 'VEH-P-08', message: 'POL-08 dispatched. Proceeding to Dansoman. ETA 5 minutes.' },
  { vehicleId: 'VEH-C-02', message: 'CMD-02 on the move. Heading to Motorway to coordinate INC-2024-003.' },
  { vehicleId: 'VEH-R-04', message: 'RSC-04 on scene. Flood victims located, rescue operation underway.' },
]

function randomAck(): string {
  return ACK_PHRASES[Math.floor(Math.random() * ACK_PHRASES.length)]
}

// Simulate an inbound acknowledgment from a vehicle after a short delay
async function simulateVehicleResponse(
  targetVehicle: Vehicle,
  channel: RadioChannel,
  delayMs: number,
) {
  await sleep(delayMs)
  const ack: DispatchMessage = {
    id: `MSG-${generateId()}`,
    fromId: targetVehicle.id,
    fromName: targetVehicle.callSign,
    toId: 'COMMAND',
    toName: 'NERDC Command',
    content: randomAck(),
    type: 'acknowledgment',
    channel,
    timestamp: new Date().toISOString(),
    acknowledged: true,
    direction: 'inbound',
  }
  messageStore.add(ack)
}

export const communicationService = {
  async getMessages(): Promise<DispatchMessage[]> {
    await sleep(200)
    return messageStore.getAll()
  },

  /**
   * Send a message from Command to a vehicle, service group, or all units.
   * TODO: Replace with ws.send(JSON.stringify(msg)) when backend is ready.
   */
  async sendMessage(params: {
    toId: string
    toName: string
    content: string
    channel: RadioChannel
    senderName: string
  }): Promise<DispatchMessage> {
    await sleep(120)

    const msg: DispatchMessage = {
      id: `MSG-${generateId()}`,
      fromId: 'COMMAND',
      fromName: params.senderName,
      toId: params.toId,
      toName: params.toName,
      content: params.content,
      type: params.toId === 'ALL' ? 'broadcast' : 'command',
      channel: params.channel,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      direction: 'outbound',
    }
    messageStore.add(msg)

    // Simulate vehicle acknowledgments
    if (params.toId === 'ALL') {
      // A few random vehicles respond to broadcasts
      const vehicles = vehicleStore.getAll().filter((v) => v.status !== 'offline')
      const responders = vehicles.sort(() => Math.random() - 0.5).slice(0, 3)
      responders.forEach((v, i) => {
        simulateVehicleResponse(v, params.channel, 2000 + i * 1200)
      })
    } else {
      const vehicle = vehicleStore.getById(params.toId)
      if (vehicle && vehicle.status !== 'offline') {
        simulateVehicleResponse(vehicle, params.channel, 1800 + Math.random() * 2000)
      }
    }

    return msg
  },

  /** Inject random inbound status chatter to make the radio feel live */
  startRadioChatter(intervalMs = 45000): () => void {
    let chatterIndex = 0
    const timer = setInterval(() => {
      const item = STATUS_CHATTER[chatterIndex % STATUS_CHATTER.length]
      chatterIndex++
      const vehicle = vehicleStore.getById(item.vehicleId)
      if (!vehicle || vehicle.status === 'offline') return
      const msg: DispatchMessage = {
        id: `MSG-${generateId()}`,
        fromId: vehicle.id,
        fromName: vehicle.callSign,
        toId: 'COMMAND',
        toName: 'NERDC Command',
        content: item.message,
        type: 'status_update',
        channel: vehicle.channel,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        direction: 'inbound',
      }
      messageStore.add(msg)
    }, intervalMs)
    return () => clearInterval(timer)
  },

  subscribeToMessages(fn: (msgs: DispatchMessage[]) => void) {
    return messageStore.subscribe(fn)
  },

  async acknowledgeMessage(id: string): Promise<void> {
    await sleep(80)
    messageStore.acknowledge(id)
  },
}
