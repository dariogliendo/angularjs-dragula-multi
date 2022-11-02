'use strict'

function register(angular) {
  return ['dragulaService', (dragulaFactory) => {
    return {
      restrict: 'A',
      scope: {
        dragulaModel: '=',
        dragulaOndrag: '<',
        dragulaOndrop: '<',
        dragulaContainerOptions: '<'
      },
      link: function ($scope, element, attrs) {
        dragulaFactory.handleDrake(element, attrs, $scope)
      }
    }
  }]
}

module.exports = register;