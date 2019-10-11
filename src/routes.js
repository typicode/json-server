const controller = require('./controller')
const authController = require('./auth-controller')

module.exports = [
  {
    method: 'POST',
    route: '/auth/login',
    controller: authController.login
  },
  {
    method: 'POST',
    route: '/auth/register',
    controller: authController.register
  },
  {
    method: 'GET',
    route: '/auth/details',
    controller: authController.getAccountDetails
  },
  {
    method: 'GET',
    route: '/exchange',
    controller: controller.exchangeCurrency
  }
]
