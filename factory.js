'use strict'
const dragula = require('dragula')

function register() {
  return [() => {
    // Vars
    let bags = []
    // bag: es un agrupador de configuraciones de un *drake*
    // drake: es la instancia de drag and drop, agrupa los *contenedores* entre los que se puede hacer drag and drop
    // contenedor: es un contenedor declarado por el uso de la directiva "dragula", cada contenedor puede tener sus propias opciones
    const getSourceBag = (source) => {
      return bags.find(f => f.drake.containers.find(f => f === source))
    }

    const getContainerOption = (bag, option, container) => {
      const optionArray = bag[option]
      if (!optionArray) return console.warn('invalid option name')
      let result = optionArray.find(f => f.element === container)
      if (result && typeof result.function === 'function') return result.function
    }

    const getContainerModel = (bag, container) => {
      if (!bag || !bag.models || !bag.models.length) return
      let modelObj = bag.models.find(f => f.element === container)
      return modelObj.model
    }

    // Handlers
    const movesHandler = (el, source, handle, sibling) => {
      const sourceBag = getSourceBag(source)
      if (sourceBag.nested) {
        const [handleSource] = $(handle).closest('[dragula]')
        if (handleSource !== source) return false
      }
      let handler = sourceBag && sourceBag.moves.find(f => f.element === source)
      if (handler) return handler.function(el, source, handle, sibling)
      return true
    }

    const acceptsHandler = (el, target, source, handle, sibling) => {
      const sourceBag = getSourceBag(source)
      let handler = sourceBag && sourceBag.accepts.find(f => f.element === source)
      if (handler) return handler.function(el, target, source, handle, sibling)
      return true
    }

    const copyHandler = (el, source) => {
      const sourceBag = getSourceBag(source)
      let handler = sourceBag && sourceBag.copy.find(f => f.element === source)
      if (handler) return handler.function(el, source)
      return false
    }

    const insertContainerOptions = (bag, containerOptions, element) => {
      if (!containerOptions) return

      const { nested, moves, accepts, copy } = containerOptions
      bag.nested = nested
      if (moves && typeof moves === 'function') {
        let existingHandler = bag.moves.find(f => f.element === element)
        if (existingHandler) existingHandler.function = moves
        else bag.moves.push({
          element: element,
          function: moves
        })
      }
      if (accepts && typeof accepts === 'function') {
        let existingHandler = bag.accepts.find(f => f.element === element)
        if (existingHandler) existingHandler.function = moves
        else bag.accepts.push({
          element: element,
          function: accepts
        })
      }
      if (copy) {
        let copyFunction;
        if (typeof copy === 'function') copyFunction = copy
        else copyFunction = () => copy // Copy puede ser un boolean, pero el factory necesita que sea una función, entonces me aseguro de que lo sea
        let existingHandler = bag.copy.find(f => f.element === element)
        if (existingHandler) existingHandler.function = moves
        else bag.copy.push({
          element: element,
          function: copyFunction
        })
      }
    }


    const attachDefaultEvents = (bag, element, attrs, scope) => {
      const { drake } = bag
      const { dragulaOndrag: drag, dragulaOndrop: drop } = scope

      if (!bag.events) bag.events = {}
      if (!bag.events.drag) bag.events.drag = []
      if (typeof drag === 'function') {
        let existingHandler = bag.events.drag.find(f => f.element === element)
        if (existingHandler) existingHandler.function = drag
        else bag.events.drag.push({
          element: element,
          function: drag
        })
      }
      if (!bag.events.drop) bag.events.drop = []
      if (typeof drop === 'function') {
        let existingHandler = bag.events.drop.find(f => f.element === element)
        if (existingHandler) existingHandler.function = drop
        else bag.events.drop.push({
          element: element,
          function: drop
        })
      }

      // Guardo la info del drag porque la necesito al hacer drop
      let dragIdx // index del elemento a la hora de 'drag'
      let sourceModelObj
      /// Registro de eventos
      if (drake.registered) return // No registrar dos veces ¡¡¡ LOS EVENTOS SON ACUMULABLES !!!
      drake.on('drag', (el, source) => {
        sourceModelObj = bag.models.find(f => f.element === element)
        let item, model;
        if (sourceModelObj) {
          model = sourceModelObj.model
          dragIdx = Array.from(source.children).filter(f => $(f).attr('ng-repeat')).indexOf(el)
          item = model[dragIdx]
        }
        let containerDrag = bag.events.drag.find(f => f.element === source)
        if (containerDrag && typeof containerDrag.function === 'function') {
          containerDrag.function(item, model, el, source)
        }
      })
      drake.on('drop', (el, target, source, sibling) => {
        scope.$applyAsync(() => {
          let targetModelObj = bag.models.find(f => f.element === target)
          let targetModel, item
          let sourceModel = getContainerModel(bag, source)
          if (source === target) {
            const dropIdx = Array.from(source.children).filter(f => $(f).attr('ng-repeat')).indexOf(el)
            if (sourceModel) sourceModel.splice(dropIdx, 0, sourceModel.splice(dragIdx, 1)[0])
            targetModel = sourceModel
          } else {
            targetModel = targetModelObj.model
            const dropIdx = Array.from(target.children).filter(f => $(f).attr('ng-repeat')).indexOf(el)
            if (sourceModel && targetModel) {
              let copyHandler = getContainerOption(bag, 'copy', source)
              let copy = copyHandler && typeof copyHandler === 'function' && copyHandler()
              item = sourceModel[dragIdx]
              if (!copy) {
                sourceModel.splice(dragIdx, 1)
              }
              targetModel.splice(dropIdx, 0, item)
            }
            target.removeChild(el)
          }
          let containerDrop = bag.events.drop.find(f => f.element === target)
          if (containerDrop && typeof containerDrop.function === 'function') {
            containerDrop.function(item, targetModel, sourceModel, el, target, source, sibling)
          }
        })
      })
      drake.registered = true
    }

    // Elimino contenedores y su configuración cuando se destruyen
    const unregister = (drake, element) => {
      if (!drake) return
      let elIx = drake.containers.indexOf(element)
      if (elIx > -1) drake.containers.splice(elIx, 1)
      if (drake.moves) {
        let movesIx = drake.moves.map(m => m.element).indexOf(element)
        if (movesIx > -1) drake.moves.splice(movesIx, 1)
      }
      if (drake.accepts) {
        let acceptsIx = drake.accepts.map(m => m.element).indexOf(element)
        if (acceptsIx > -1) drake.accepts.splice(acceptsIx, 1)
      }
      drake.off()
    }

    // Creación de drakes
    const handleDrake = (element, attrs, $scope) => {
      [element] = element
      let { dragulaModel: model, dragulaContainerOptions: containerOptions } = $scope
      if (typeof attrs.dragula !== 'string') return console.error('dragula must be a string')
      const bagName = attrs.dragula
      let bag = bags.find(f => f.name === bagName)
      if (!bag) {
        bag = {
          name: bagName,
          moves: [],
          accepts: [],
          copy: [],
          copySortSource: [],
          models: [],
          events: {
            drag: [],
            drop: [],
          }
        }
        bag.drake = dragula({
          moves: movesHandler,
          accepts: acceptsHandler,
          copy: copyHandler,
        })
        bags.push(bag)
      }
      bag.drake.containers.push(element)
      if (attrs.dragulaModel) {
        let oldModel = bag.models.find(f => f.element === element)
        if (oldModel) oldModel.model = model
        else bag.models.push({
          element: element,
          model: model || []
        })
      }
      insertContainerOptions(bag, containerOptions, element, attrs, $scope)
      attachDefaultEvents(bag, element, attrs, $scope)

      $scope.$watch('dragulaModel', (newValue, oldValue) => {
        if (newValue === oldValue) return
        if (!bag) return
        if (!bag.models) bag.models = []
        let model = bag.models.find(f => f.element === element)
        model.model = [...newValue]
      })
      $scope.$watch('dragulaOndrag', (newValue, oldValue) => {
        if (!bag) return
        if (!bag.events) bag.events = {}
        if (!bag.events.drag) bag.events.drag = []
        let existingHandler = bag.events.drag.find(f => f.element === element)
        if (existingHandler) existingHandler.function = newValue
        else bag.events.drag.push({ element: element, function: newValue })
      })
      $scope.$watch('dragulaOndrop', (newValue, oldValue) => {
        if (!bag) return
        if (!bag.events) bag.events = {}
        if (!bag.events.drag) bag.events.drop = []
        let existingHandler = bag.events.drop.find(f => f.element === element)
        if (existingHandler) existingHandler.function = newValue
        else bag.events.drag.push({ element: element, function: newValue })
      })
      $scope.$watch('dragulaContainerOptions', (newValue, oldValue) => {
        containerOptions = newValue
        insertContainerOptions()
      })
      $scope.$on('$destroy', () => { unregister(bag.drake, element, containerOptions) }) // Esto toma el $scope de la directiva y se encarga de desregistrar su instancia de dragula cuando se destruye
    }

    const getDrake = (name) => {
      const bag = bags.find(f => f.name === name)
      return bag && bag.drake
    }

    return {
      handleDrake: handleDrake,
      getDrake: getDrake,
      getSourceBag: getSourceBag,
    }
  }]
}

module.exports = register