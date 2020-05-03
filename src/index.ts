import { MonoTypeOperatorFunction, Observable } from 'rxjs'

export const presets = {
  noWobble: [170, 26],
  gentle: [120, 14],
  wobbly: [180, 12],
  stiff: [210, 20]
}

export const mapValues = <A, B, K extends string>(
  f: (value: A, key: K) => B,
  obj: Record<K, A>
): Record<K, B> =>
  (Object.keys(obj) as K[]).reduce<Record<K, B>>(
    (acc, k) => ({ ...acc, [k]: f(obj[k], k) }),
    {} as Record<K, B>
  )

const switchMap = <A, B>(switchMapper: (value: A) => Observable<B>) => (
  stream: Observable<A>
): Observable<B> => {
  let subscription

  return new Observable(observer => {
    let isOuterStreamComplete = false
    let isInnerStreamComplete = false

    const sub = stream.subscribe({
      next: x => {
        if (subscription) subscription.unsubscribe()
        subscription = switchMapper(x).subscribe({
          error: e => observer.error(e),
          next: x => observer.next(x),
          complete: () => {
            isInnerStreamComplete = true
            if (isOuterStreamComplete) observer.complete()
          }
        })
      },
      error: e => observer.error(e),
      complete: () => {
        isOuterStreamComplete = true
        if (isInnerStreamComplete) observer.complete()
      }
    })

    return {
      unsubscribe: () => {
        if (subscription) subscription.unsubscribe()
        sub.unsubscribe()
      }
    }
  })
}

const defaultSecondPerFrame = 0.016

const rafThrottle = <T extends []>(
  f: (...args: T) => void
): ((...args: T) => void) => {
  let isFirst = true
  let shouldExecute = true
  let args = [] as T
  return (..._args: T) => {
    if (isFirst) {
      isFirst = false
      f(..._args)
    } else {
      args = _args
      if (!shouldExecute) return
      shouldExecute = false
      window.requestAnimationFrame(() => {
        shouldExecute = true
        f(...args)
      })
    }
  }
}

// stepper :: Number -> Number -> Number -> Number? -> Number? -> Number? -> [Number, Number]
let reusedTuple: [number, number] = [0, 0]
function stepper(
  value: number,
  velocity: number,
  destValue: number,
  stiffness = 170,
  damping = 20,
  secondPerFrame = defaultSecondPerFrame,
  precision = 0.1
): [number, number] {
  // Spring stiffness, in kg / s^2

  // for animations, destValue is really spring length (spring at rest). initial
  // position is considered as the stretched/compressed position of a spring
  const Fspring = -stiffness * (value - destValue)

  // Damping, in kg / s
  const Fdamper = -damping * velocity

  // usually we put mass here, but for animation purposes, specifying mass is a
  // bit redundant. you could simply adjust k and b accordingly
  // let a = (Fspring + Fdamper) / mass
  const a = Fspring + Fdamper

  const newVelocity = velocity + a * secondPerFrame
  const newValue = value + newVelocity * secondPerFrame

  if (
    Math.abs(newVelocity) < precision &&
    Math.abs(newValue - destValue) < precision
  ) {
    reusedTuple[0] = destValue
    reusedTuple[1] = 0
    return reusedTuple
  }

  reusedTuple[0] = newValue
  reusedTuple[1] = newVelocity
  return reusedTuple
}

// createEasedStream :: (number, number) -> number -> Observable number
const createEasedStream = (stiffness: number, damping: number) => {
  let value: number
  let velocity = 0
  let destValue: number

  return (x: number): Observable<number> => {
    destValue = x
    if (value === undefined) value = x

    return new Observable(observer => {
      let isRunning = true

      const run = rafThrottle(() => {
        ;[value, velocity] = stepper(
          value,
          velocity,
          destValue,
          stiffness,
          damping
        )

        observer.next(value)
        if (velocity !== 0 && isRunning) {
          run()
        }
      })

      run()

      return {
        unsubscribe() {
          isRunning = false
        }
      }
    })
  }
}

type ArrayConfig = [number, number][]

// createEasedStreamArray :: [[number, number]] -> [number] -> Observable [number]
const createEasedStreamArray = (configs: ArrayConfig) => {
  let values
  let velocities = configs.map(() => 0)
  let destValues

  return <T extends number[]>(xs: T): Observable<T> => {
    destValues = xs
    if (values === undefined) values = xs

    return new Observable(observer => {
      let isRunning = true

      const run = rafThrottle(() => {
        for (let i = 0; i < configs.length; i++) {
          const [stiffness, damping] = configs[i]
          ;[values[i], velocities[i]] = stepper(
            values[i],
            velocities[i],
            destValues[i],
            stiffness,
            damping
          )
        }

        observer.next(values)
        if (velocities.some(velocity => velocity !== 0) && isRunning) {
          run()
        }
      })

      run()

      return {
        unsubscribe() {
          isRunning = false
        }
      }
    })
  }
}

type ObjectConfig<K extends string | number | symbol = string> = Record<
  K,
  [number, number]
>

// createEasedStreamObject :: Map k [number, number] -> Map k number -> Observable (Map k number)
const createEasedStreamObject = (configs: ObjectConfig) => {
  let values
  let velocities = mapValues(() => 0, configs)
  let destValues

  return <T extends Record<string, number>>(obj: T): Observable<T> => {
    destValues = obj
    if (values === undefined) values = obj

    return new Observable(observer => {
      let isRunning = true

      const run = rafThrottle(() => {
        for (let k in configs) {
          const [stiffness, damping] = configs[k]
          ;[values[k], velocities[k]] = stepper(
            values[k],
            velocities[k],
            destValues[k],
            stiffness,
            damping
          )
        }

        observer.next(values)
        if (
          Object.keys(velocities).some(k => velocities[k] !== 0) &&
          isRunning
        ) {
          run()
        }
      })

      run()

      return {
        unsubscribe() {
          isRunning = false
        }
      }
    })
  }
}

function createEase(
  stiffness: number,
  damping: number
): (value: number) => Observable<number>
function createEase<T extends number[]>(
  config: ArrayConfig
): (value: T) => Observable<T>
function createEase<T extends Record<string, number>>(
  config: ObjectConfig
): (value: T) => Observable<T>
function createEase(
  stiffness: number | ArrayConfig | ObjectConfig,
  damping?: number
) {
  return Array.isArray(stiffness)
    ? createEasedStreamArray(stiffness)
    : typeof stiffness === 'object'
    ? createEasedStreamObject(stiffness)
    : createEasedStream(stiffness, damping)
}

const cache = new Map()

function getEase(
  stiffness: number,
  damping: number,
  id?: string
): (value: number) => Observable<number>
function getEase<T extends number[]>(
  config: ArrayConfig,
  id?: string
): (value: T) => Observable<T>
function getEase<T extends Record<string, number>>(
  config: ObjectConfig,
  id?: string
): (value: T) => Observable<T>
function getEase(stiffness: any, damping?: any, id?: string) {
  if (id === undefined && typeof stiffness === 'object') id = damping

  if (id === undefined) return createEase(stiffness, damping)

  if (!cache.has(id)) cache.set(id, createEase(stiffness, damping))
  return cache.get(id)
}

function easeOperator<T extends number>(
  stiffness: number,
  damping: number,
  id?: string
): MonoTypeOperatorFunction<T>
function easeOperator<T extends number[]>(
  config: ArrayConfig,
  id?: string
): MonoTypeOperatorFunction<T>
function easeOperator<T extends { [k in K]: number }, K extends keyof T>(
  config: ObjectConfig<K>,
  id?: string
): MonoTypeOperatorFunction<T>
function easeOperator(stiffness: any, damping?: any, id?: any) {
  return switchMap(getEase(stiffness, damping, id))
}

export default easeOperator
