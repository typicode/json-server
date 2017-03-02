/* global m */

// Resource list
var resources = []

m.request('db').then(function (data) {
  resources = Object.keys(data)
})

m.mount(
  document.getElementById('resources'),
  {
    view: function () {
      return m('ul', resources.map(function (resource) {
        return m('li',
          m('a', { href: resource }, resource)
        )
      }))
    }
  }
)

// Custom routes
var rules = {}

m.request('__rules').then(function (data) {
  rules = data
})

m.mount(
  document.getElementById('custom-routes'),
  {
    view: function () {
      return [
        m('p', 'And the custom routes:'),
        m('ul', Object.keys(rules).map(function (rule) {
          return m('li', rule + ' → ' + rules[rule])
        }))
      ]
    }
  }
)
