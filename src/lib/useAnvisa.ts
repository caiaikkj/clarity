import { useEffect, useSyncExternalStore } from 'react'
import { getMedsVersion, subscribeMeds } from '../data/anvisaMeds'
import { loadCmedMeds } from '../data/cmedMeds'

export const useMedsVersion = () => {
  useEffect(() => {
    void loadCmedMeds()
  }, [])
  return useSyncExternalStore(subscribeMeds, getMedsVersion, getMedsVersion)
}
