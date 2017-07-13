/* global m */

// Resource list
var db = {}

m.request('db').then(function(data) {
  db = data
})

m.mount(document.getElementById('resources'), {
  view: function() {
    var keys = Object.keys(db)
    var resourceList = m(
      'ul',
      keys
        .map(function(key) {
          return m('li', [
            m('a', { href: key }, '/' + key),
            m(
              'sup',
              Array.isArray(db[key]) ? ' ' + db[key].length + 'x' : ' object'
            )
          ])
        })
        .concat([m('a', { href: 'db' }, '/db'), m('sup', m('em', ' state'))])
    )

    return [
      m('h4', 'Resources'),
      keys.length ? resourceList : m('p', 'No resources found')
    ]
  }
})

// Custom routes
var customRoutes = {}

m.request('__rules').then(function(data) {
  customRoutes = data
})

m.mount(document.getElementById('custom-routes'), {
  view: function() {
    var rules = Object.keys(customRoutes)
    if (rules.length) {
      return [
        m('h4', 'Custom routes'),
        m(
          'table',
          rules.map(function(rule) {
            return m('tr', [m('td', rule), m('td', '⇢ ' + customRoutes[rule])])
          })
        )
      ]
    }
  }
})
