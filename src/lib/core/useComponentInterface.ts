import { useEffect, useState, useRef, useCallback } from 'react'
import {makeId, useRcip} from './RcipProvider'

export function useComponentInterface(name: string, description: string) {
  const { registerComponent, unregisterComponent, registerAction } = useRcip()
  const [componentId] = useState(makeId(name))
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!registeredRef.current) {
      registerComponent({ componentId, componentName: name, description })
      registeredRef.current = true
    }
    return () => {
      unregisterComponent(componentId)
    }
  }, [componentId, name, description, registerComponent, unregisterComponent])

  const addAction = useCallback(<P, R>(
    actionName: string,
    description: string,
    execute: (payload: P) => R | Promise<R>
  ): string => {
    return registerAction(componentId, actionName, description, execute)
  }, [componentId, registerAction])

  return { componentId, addAction }
}
