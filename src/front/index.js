import 'promise-polyfill/src/polyfill'
import 'whatwg-fetch'
import './style.css'

function ResourceItem({ name, length }) {
  return `
    <li>
      <a href="${name}">/${name}</a>
      <sup>${length ? `${length}x` : 'object'}</sup>
    </li>
  `
}

function ResourceList({ db }) {
  return `
    <ul>
      ${Object.keys(db)
        .map(name =>
          ResourceItem({
            name,
            length: Array.isArray(db[name]) && db[name].length
          })
        )
        .join('')}
    </ul>
  `
}

function NoResources() {
  return `<p>No resources found</p>`
}

function ResourcesBlock({ db }) {
  return `
    <div>
      <h1>Resources</h1>
      ${Object.keys(db).length ? ResourceList({ db }) : NoResources()}
    </div>
  `
}

window
  .fetch('db')
  .then(response => response.json())
  .then(
    db =>
      (document.getElementById('resources').innerHTML = ResourcesBlock({ db }))
  )

function CustomRoutesBlock({ customRoutes }) {
  const rules = Object.keys(customRoutes)
  if (rules.length) {
    return `
      <div>
        <h1>Custom Routes</h1>
        <table>
          ${rules
            .map(
              rule =>
                `<tr>
              <td>${rule}</td>
              <td><code>⇢</code> ${customRoutes[rule]}</td>
            </tr>`
            )
            .join('')}
        </table>
      </div>
    `
  }
}

window
  .fetch('__rules')
  .then(response => {
    if (!response.ok) {
      throw Error(response.statusText)
    } else {
      return response.ok
    }
  })
  .then(response => response.json())
  .then(customRoutes => {
    document.getElementById('custom-routes').innerHTML = CustomRoutesBlock({
      customRoutes
    })
  })
  .catch(error => console.log(error))
