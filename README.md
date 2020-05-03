# rx-ease

An operator to interpolate the values of your rxjs streams!

- **Typescript** support.
- Performant, **60fps**.
- Emits on **requestAnimationFrame**.
- Works with any kind of data structures (Object, arrays, single values).

## Install

```
npm install rxjs rx-ease
```

## The gist

#### Interpolate a single value
```js
import { interval } from 'rxjs'
import { take, map, startWith } from 'rxjs/operators'
import ease from 'rx-ease'

const draw = x =>
  Array(Math.floor(x))
    .fill('#')
    .join('')

const progress$ = interval(1000).pipe(
  take(1),
  map(() => 100),
  startWith(0),
  ease(120, 18),
  map(draw)
)

progress$.subscribe(progress => console.log(progress))
// will log =>
// #
// ####
// ########
// #############
// #################
// ######################
// ##########################
// ##############################
// ##################################
// ######################################
// #########################################
// ############################################
// ##############################################
// ################################################
// ##################################################
// ####################################################
// #####################################################
// ######################################################
// #######################################################
// ########################################################
// #########################################################
// ##########################################################
// ##########################################################
// ##########################################################
// ##########################################################
```

#### Interpolate several values of an object
```js
import { fromEvent } from 'rxjs'
import { map } from 'rxjs/operators'
import ease from 'rx-ease'

const circle = document.querySelector('.circle')

const position$ = fromEvent(document, 'click').pipe(
  map(e => ({ x: e.clientX, y: e.clientY })),
  ease({
    x: [120, 18],
    y: [120, 18]
  })
)

position$.subscribe(({ x, y }) => {
  circle.style.transform = `translate(${x}px, ${y}px)`
})
```

## Api


#### type Config = [number, number]
Similarly to [react-motion](https://github.com/chenglou/react-motion), rx-ease is a **spring animation** operator. To configure the animation you need to pass a stiffness and a damping value in an array like `[stiffness, damping]` (for example `[120, 18]`).

#### ease: (config: Config) => (stream: Observable<number>) => Observable<number>

```js
import { interval } from 'rxjs'
import ease from 'rx-ease'

const easedInterval$ = interval(1000).pipe(
  map(x => x * 100),
  ease([170, 26])
)
```

#### ease: (config: Config[]) => (stream: Observable<number[]>) => Observable<number[]>

```js
import { fromEvent } from 'rxjs'
import ease from 'rx-ease'

const easedMousePosition$ = fromEvent(window, 'mousemove').pipe(
  map(e => [e.clientX, e.clientY]),
  ease([
    [170, 26],
    [170, 26],
  ])
)
```

#### ease: (config: Record<K, Config>) => (stream: Observable<Record<K, Config>>) => Observable<Record<K, Config>>

```js
import { fromEvent } from 'rxjs'
import ease from 'rx-ease'

const easedMousePosition$ = fromEvent(window, 'mousemove').pipe(
  map(e => ({
    x: e.clientX,
    y: e.clientY]
  }),
  ease({
    x: [170, 26],
    y: [170, 26],
  })
)
```

#### presets
- **noWobble**: equivalent to passing `[170, 26]`
- **gentle**: equivalent to passing `[120, 14]`
- **wobbly**: equivalent to passing `[180, 12]`
- **stiff**: equivalent to passing `[210, 20]`

```js
import ease, { presets } from 'rx-ease'

interval(1000).pipe(
  map(x * 100),
  ease(...presets.stiff)
)
```

## Credits

This was heavily inspired by @chenglou's [react-motion](https://github.com/chenglou/react-motion).
