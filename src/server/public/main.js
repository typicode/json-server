/* global m */

// Resource list
var db = {}

m.request('db').then(function (data) {
  db = data
})

m.mount(
  document.getElementById('resources'),
  {
    view: function () {
      var keys = Object.keys(db)
      console.log(keys, db)
      return m('ul', keys.map(function (key) {
        return m('li', [
          m('a', { href: key }, key),
          m('span', Array.isArray(db[key])
            ? '(' + db[key].length + ')'
            : '(1)'
          )
        ])
      }))
    }
  }
)

// Custom routes
var customRoutes = {}

m.request('__rules').then(function (data) {
  customRoutes = data
})

m.mount(
  document.getElementById('custom-routes'),
  {
    view: function () {
      var rules = Object.keys(customRoutes)
      if (rules.length) {
        return [
          m('p', 'And the custom routes:'),
          m('table', rules.map(function (rule) {
            return m('tr', [
              m('td', rule),
              m('td', '⇢ ' + rules[rule])
            ])
          }))
        ]
      }
    }
  }
)
