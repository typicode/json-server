const controller = require('./controller')

module.exports = {
  post: [
    {
      route: '/user',
      controller: controller.adduser
    }
  ],
  get: [
    {
      route: '/user',
      controller: controller.getUser
    },
    {
      route: '/exchange',
      controller: controller.exchangeCurrency
    }
  ]
}
