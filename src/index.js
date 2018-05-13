import { Observable } from 'rxjs'

const switchMap = switchMapper => stream => {
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

const rafThrottle = f => {
  let shouldExecute = true
  let args = []
  return (..._args) => {
    args = _args
    if (!shouldExecute) return
    shouldExecute = false

    window.requestAnimationFrame(() => {
      shouldExecute = true
      f(...args)
    })
  }
}

// stepper :: Number -> Number -> Number -> Number? -> Number? -> Number? -> [Number, Number]
let reusedTuple = [0, 0]
function stepper(
  value,
  velocity,
  destValue,
  stiffness = 170,
  damping = 20,
  secondPerFrame = defaultSecondPerFrame,
  precision = 0.1
) {
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

const ease = (stiffness, damping) => {
  let value
  let velocity = 0
  let destValue

  return x => {
    destValue = x
    if (value === undefined) value = x

    return new Observable(observer => {
      let isRunning = true

      const run = rafThrottle(() => {
        [value, velocity] = stepper(
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

const cache = new Map()

const getEase = (stiffness, damping, id) => {
  if (id === undefined) return ease(stiffness, damping)

  if (!cache.has(id)) cache.set(id, ease(stiffness, damping))
  return cache.get(id)
}

const easeOperator = (...args) => switchMap(getEase(...args))

export default easeOperator
