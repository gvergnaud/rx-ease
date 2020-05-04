# rx-ease

An operator to interpolate between values in your rxjs streams!

- **Physic based**. The animation seemlessly interupts itself if a new value is emitted before it completes.
- **Performant**, emits on **requestAnimationFrame** at 60fps.
- **Typescript** first class support.
- **Versatile**, Works with any kind of data structures (Object, arrays, single values).

## Install

```
npm install rxjs rx-ease
```

## The gist

#### Interpolate a single value

You can simply use the `ease` operator in an observable pipeline. You need to configure the ease operator with two numbers: a **stiffness** value and a **damping** value. See [the presets sections](https://github.com/gvergnaud/rx-ease#presets) bellow for example of configurations.


```js
import { interval } from 'rxjs'
import { take, map, startWith } from 'rxjs/operators'
import ease from 'rx-ease'

const draw = x =>
  Array(Math.floor(x))
    .fill('#')
    .join('')

const progress$ = interval(1000).pipe(
  startWith(0),
  map(i => * 100),
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

#### Interpolate several properties of an object

If your Observable emits an object instead of a single number, you can use the `ease` operator to interpolate the values of one or several properties of this object. Just pass to `ease` an object of the same shape as the observed value with a config for each property you want to ease.

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

Similarly to [react-motion](https://github.com/chenglou/react-motion), rx-ease is a **spring animation** operator. To configure the animation you need to pass a stiffness and a damping value in an array like `[stiffness, damping]` (for example `[120, 18]`).



#### Easing a single value

##### signature

```ts
type Config = [number, number]
ease: (config: Config) => (stream: Observable<number>) => Observable<number>
```

##### example

```js
import { interval } from 'rxjs'
import ease from 'rx-ease'

const easedInterval$ = interval(1000).pipe(
  map(x => x * 100),
  ease([170, 26])
)
```


#### Easing values of an array

##### signature

```ts
ease: (config: Config[]) => (stream: Observable<number[]>) => Observable<number[]>
```

##### example

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

#### Easing properties of an object

##### signature

```ts
ease: (config: Record<K, Config>) => (stream: Observable<Record<K, Config>>) => Observable<Record<K, Config>>
```

##### example

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
