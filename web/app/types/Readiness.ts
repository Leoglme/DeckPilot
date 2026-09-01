export type ReadinessStepId = 'update' | 'engine' | 'devices' | 'conflicts'

export type ReadinessStepStatus = 'pending' | 'running' | 'ok' | 'warning' | 'action-required'

export type ReadinessStep = {
  id: ReadinessStepId
  label: string
  detail: string
  status: ReadinessStepStatus
}

export type ReadinessReport = {
  ready: boolean
  steps: ReadinessStep[]
}
