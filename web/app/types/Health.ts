export type DriverCategory = 'gpu' | 'network' | 'audio' | 'system' | 'storage'

export type DriverFreshness = 'recent' | 'old'

/** A driver exactly as Windows reports it (via the Tauri `health_list_drivers` command). */
export type RawDriver = {
  name: string
  provider: string
  version: string
  date: string
  deviceClass: string
}

/** A driver prepared for display: the real Windows data plus a category and a freshness verdict. */
export type Driver = {
  id: string
  name: string
  provider: string
  version: string
  date: string
  category: DriverCategory
  freshness: DriverFreshness
}

/** Drivers of one category, grouped for display on the Machine page. */
export type DriverGroup = {
  category: DriverCategory
  label: string
  icon: string
  drivers: Driver[]
}
