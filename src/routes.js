const authController = require("./controller");

module.exports = [
  {
    method: "POST",
    route: "/account/login",
    controller: authController.login,
  },
  {
    method: "POST",
    route: "/account/logout",
    controller: authController.logout,
  },
  {
    method: "GET",
    route: "/account/details",
    controller: authController.getAccountDetails,
  },
  {
    method: "GET",
    route: "/books",
    controller: authController.getUserBooks,
  },
  {
    method: "GET",
    route: "/shelves",
    controller: authController.getUserShelves,
  },
  {
    method: "POST",
    route: "/shelves",
    controller: authController.addShelve,
  },
];
