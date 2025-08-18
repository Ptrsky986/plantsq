import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { addDays, format } from 'date-fns'

const useAppStore = create(persist((set, get) => ({
  settings: {
    startDate: '2025-07-30',
    initialPortfolio: 2361,
    forecastWindow: 7,
  },
  thirdSignal: { active: false, startDate: null },
  days: {}, // 'YYYY-MM-DD': { signals: [r1,r2,r3,r4], dailySum, portfolioAfter }

  setStartDate: (date) => set(state => ({ settings: { ...state.settings, startDate: date } })),
  setInitialPortfolio: (value) => set(state => ({ settings: { ...state.settings, initialPortfolio: Number(value) || 0 } })),
  setForecastWindow: (n) => set(state => ({ settings: { ...state.settings, forecastWindow: Math.max(1, Number(n) || 7) } })),

  activateThirdSignal: (startDateISO) => set(() => ({ thirdSignal: { active: true, startDate: startDateISO || format(new Date(), 'yyyy-MM-dd') } })),
  deactivateThirdSignal: () => set(() => ({ thirdSignal: { active: false, startDate: null } })),
  daysRemainingThird: () => {
    const { thirdSignal } = get()
    if (!thirdSignal.active || !thirdSignal.startDate) return 0
    const start = new Date(thirdSignal.startDate)
    const end = addDays(start, 5)
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24))
    const remaining = Math.max(0, diff)
    if (remaining === 0 && thirdSignal.active) {
      // Auto-desactivar en día 0
      set(() => ({ thirdSignal: { active: false, startDate: null } }))
    }
    return remaining
  },

  saveDay: (dateISO, results) => {
    const clean = (v) => Number(v) || 0
    const signals = results.map(clean)
    const dailySum = signals.reduce((a, b) => a + b, 0)

    // 1) Escribe/actualiza el día con signals + dailySum (portfolioAfter se recalcula luego)
    const current = { ...get().days }
    current[dateISO] = { ...(current[dateISO] || {}), signals, dailySum }

    // 2) Recalcula "portfolioAfter" para todas las fechas en orden
    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      acc += (current[d]?.dailySum || 0)
      current[d] = { ...current[d], portfolioAfter: acc }
    }

    set({ days: current })
  },

  clearDay: (dateISO) => {
    const current = { ...get().days }
    if (current[dateISO]) delete current[dateISO]
    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      acc += (current[d]?.dailySum || 0)
      current[d] = { ...current[d], portfolioAfter: acc }
    }
    set({ days: current })
  },

  historyLastValue: () => {
    const { days, settings } = get()
    const init = Number(settings.initialPortfolio) || 0
    const dates = Object.keys(days).sort()
    let value = init
    for (const d of dates) {
      value = (days[d]?.portfolioAfter ?? value)
    }
    return value
  },
}), {
  name: 'plantsq2-store',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState, version) => {
    if (!persistedState) return persistedState
    if (version < 1) {
      const s = persistedState.settings || {}
      const needsInit = (!s.startDate || s.startDate === null) || (!s.initialPortfolio || s.initialPortfolio === 0)
      if (needsInit) {
        return {
          ...persistedState,
          settings: {
            ...s,
            startDate: '2025-07-30',
            initialPortfolio: 2361,
            forecastWindow: s.forecastWindow ?? 7,
          },
        }
      }
    }
    if (version < 2) {
      // Migrar fourthSignal -> thirdSignal
      const { fourthSignal, thirdSignal, ...rest } = persistedState
      return {
        ...rest,
        thirdSignal: thirdSignal || fourthSignal || { active: false, startDate: null },
      }
    }
    return persistedState
  }
}))

export default useAppStore
