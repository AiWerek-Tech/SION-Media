export const PRESENTATION_BRIDGE_PROTOCOL_VERSION = 1

export type PresentationBridgeMessageType =
  | 'HELLO'
  | 'WELCOME'
  | 'AUTH'
  | 'CAPABILITIES'
  | 'HEARTBEAT'
  | 'PRESENTATION_STATE'
  | 'SLIDE_STATE_CHANGED'
  | 'FRAME_META'
  | 'FRAME_BINARY'
  | 'COMMAND'
  | 'COMMAND_ACK'
  | 'ERROR'
  | 'SESSION_RESET'
  | 'GOODBYE'

export interface PresentationCapabilities {
  eventDriven: boolean
  next: boolean
  previous: boolean
  goto: boolean
  slideExport: boolean
  binaryFrame: boolean
  speakerNotes: boolean
  nextSlidePrefetch: boolean
  animationAwareness: 'none' | 'partial' | 'full'
}

export interface PresentationState {
  provider: string
  platform: string
  deckId: string
  deckName: string
  slideIndex: number
  slideCount: number
  slideShowRunning: boolean
  title?: string
  notes?: string
  sequence: number
  updatedAt: number
}
