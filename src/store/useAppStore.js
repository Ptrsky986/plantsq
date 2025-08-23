import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { addDays, format, differenceInCalendarDays, parseISO } from 'date-fns'

const useAppStore = create(persist((set, get) => ({
  settings: {
    startDate: '2025-07-30',
    initialPortfolio: 2361,
    forecastWindow: 7,
  },
  thirdSignal: { active: false, startDate: null },
  days: {}, // 'YYYY-MM-DD': { signals: [r1,r2,r3,r4], dailySum, withdrawal, reward, portfolioAfter }

  setStartDate: (date) => set(state => ({ settings: { ...state.settings, startDate: date } })),
  setInitialPortfolio: (value) => set(state => ({ settings: { ...state.settings, initialPortfolio: Number(value) || 0 } })),
  setForecastWindow: (n) => set(state => ({ settings: { ...state.settings, forecastWindow: Math.max(1, Number(n) || 7) } })),

  activateThirdSignal: (startDateISO) => set(() => ({ thirdSignal: { active: true, startDate: startDateISO || format(new Date(), 'yyyy-MM-dd') } })),
  setThirdSignalStartDate: (startDateISO) => set((state) => ({ thirdSignal: { ...state.thirdSignal, startDate: startDateISO || null } })),
  deactivateThirdSignal: () => set(() => ({ thirdSignal: { active: false, startDate: null } })),
  daysRemainingThird: (refISO) => {
    const { thirdSignal } = get()
    if (!thirdSignal.active || !thirdSignal.startDate) return 0
    const start = parseISO(thirdSignal.startDate)
    const ref = refISO ? parseISO(refISO) : new Date()
    const end = addDays(start, 5)
    const diff = differenceInCalendarDays(end, ref)
    // Limitar entre 0 y 5:
    // - Si ref < start (periodo aún no empieza) -> mostrar 5
    // - Si start <= ref < end -> mostrar días restantes
    // - Si ref >= end -> 0
    return Math.max(0, Math.min(5, diff))
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
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
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
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
    }
    set({ days: current })
  },

  // Retiradas de fondos
  addWithdrawal: (dateISO, amount) => {
    const amt = Math.abs(Number(amount) || 0)
    if (!dateISO || amt <= 0) return
    const current = { ...get().days }
    const prev = Number(current[dateISO]?.withdrawal) || 0
    current[dateISO] = { ...(current[dateISO] || {}), withdrawal: prev + amt }

    // Recalcular portfolioAfter en orden
    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
    }
    set({ days: current })
  },

  setWithdrawal: (dateISO, amount) => {
    const amt = Math.max(0, Number(amount) || 0)
    if (!dateISO) return
    const current = { ...get().days }
    current[dateISO] = { ...(current[dateISO] || {}), withdrawal: amt }

    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
    }
    set({ days: current })
  },

  clearWithdrawal: (dateISO) => {
    if (!dateISO) return
    const current = { ...get().days }
    if (!current[dateISO]) {
      // Si no existe el día, no hay nada que recalcular
      return
    }
    current[dateISO] = { ...current[dateISO], withdrawal: 0 }

    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
    }
    set({ days: current })
  },

  // Recompensas (entradas positivas)
  addReward: (dateISO, amount) => {
    const amt = Math.abs(Number(amount) || 0)
    if (!dateISO || amt <= 0) return
    const current = { ...get().days }
    const prev = Number(current[dateISO]?.reward) || 0
    current[dateISO] = { ...(current[dateISO] || {}), reward: prev + amt }

    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
    }
    set({ days: current })
  },

  clearReward: (dateISO) => {
    if (!dateISO) return
    const current = { ...get().days }
    if (!current[dateISO]) return
    current[dateISO] = { ...current[dateISO], reward: 0 }

    const init = Number(get().settings.initialPortfolio) || 0
    const ordered = Object.keys(current).sort()
    let acc = init
    for (const d of ordered) {
      const wd = Number(current[d]?.withdrawal) || 0
      const rw = Number(current[d]?.reward) || 0
      acc += (current[d]?.dailySum || 0) - wd + rw
      current[d] = { ...current[d], withdrawal: wd, reward: rw, portfolioAfter: acc }
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

  // Exporta el estado relevante como JSON serializable
  exportState: () => {
    const state = get()
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      thirdSignal: state.thirdSignal,
      days: state.days,
    }
  },

  // Importa un objeto JSON (o string JSON) y recalcula portfolioAfter
  importState: (payload) => {
    try {
      if (!payload) return
      const current = get()
      const incoming = typeof payload === 'string' ? JSON.parse(payload) : payload

      const settings = incoming.settings || current.settings
      const thirdSignal = incoming.thirdSignal || current.thirdSignal
      const rawDays = incoming.days || {}

      const init = Number(settings.initialPortfolio) || 0
      const keys = Object.keys(rawDays).sort()
      let acc = init
      const days = {}
      for (const d of keys) {
        const e = rawDays[d] || {}
        const wd = Number(e.withdrawal) || 0
        const rw = Number(e.reward) || 0
        const dailySum = Number(e.dailySum) || (Array.isArray(e.signals) ? e.signals.reduce((a, b) => a + (Number(b) || 0), 0) : 0)
        acc += dailySum - wd + rw
        days[d] = {
          signals: Array.isArray(e.signals) ? e.signals.map(v => Number(v) || 0) : [],
          dailySum,
          withdrawal: wd,
          reward: rw,
          portfolioAfter: acc,
        }
      }

      set({ settings, thirdSignal, days })
      // Forzar guardado inmediato para que un reload refleje los datos importados
      try { useAppStore.persist?.save?.() } catch {}
      // eslint-disable-next-line no-console
      console.info('[Store] Importación completada. Días:', Object.keys(days).length)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Store] Error al importar estado', e)
    }
  },
}), {
  name: 'plantsq2-store',
  version: 4,
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
    if (version < 3) {
      // Asegurar que cada día tenga campo withdrawal inicializado a 0
      const days = persistedState.days || {}
      const newDays = {}
      for (const key of Object.keys(days)) {
        const entry = days[key] || {}
        newDays[key] = { ...entry, withdrawal: Number(entry.withdrawal) || 0 }
      }
      return { ...persistedState, days: newDays }
    }
    if (version < 4) {
      // Inicializar campo reward = 0 en todos los días existentes
      const days = persistedState.days || {}
      const newDays = {}
      for (const key of Object.keys(days)) {
        const entry = days[key] || {}
        newDays[key] = { ...entry, reward: Number(entry.reward) || 0 }
      }
      return { ...persistedState, days: newDays }
    }
    return persistedState
  }
}))

// Intento de importación desde claves legacy si la clave actual está vacía
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const state = useAppStore.getState()
    const hasData = state && state.days && Object.keys(state.days).length > 0
    if (!hasData) {
      const legacyKeys = ['plantsq-store', 'plantsq_store', 'plantsq']
      for (const key of legacyKeys) {
        const raw = window.localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw)
          const legacyState = parsed?.state || parsed
          const days = legacyState?.days || {}
          if (days && Object.keys(days).length > 0) {
            const settings = legacyState.settings || state.settings
            const thirdSignal = legacyState.thirdSignal || state.thirdSignal
            useAppStore.setState({ ...state, days, settings, thirdSignal })
            // Guardar inmediatamente bajo la clave actual
            useAppStore.persist?.save?.()
            // eslint-disable-next-line no-console
            console.info('[Store] Migración automática desde clave legacy:', key)
            break
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[Store] Fallo al parsear clave legacy', key, e)
        }
      }
    }
  }
} catch {}

export default useAppStore
