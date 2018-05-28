import 'promise-polyfill/src/polyfill'
import 'whatwg-fetch'
import { h, render } from 'preact'
import 'milligram'
import './style.css'

render(
  <div id="foo">
    <span>Hello, world!</span>
    <button onClick={e => alert('hi!')}>Click Me</button>
  </div>,
  document.body
)
