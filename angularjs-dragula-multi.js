const factory = require('./factory')
const directive = require('./directive')

function register(angular) {
  const app = angular.module('dragula', ['ng'])

  app.factory('dragula.factory', factory())
  app.directive('dragula', directive(angular))
}

module.exports = register