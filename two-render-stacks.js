const RenderStack = require('tre-render-stack')

module.exports = function TwoRenderStacks(ssb) {
  const tileRenderStack = RenderStack(ssb, {
    ctxOverrides: {
      previewObs: null,
      contentObs: null
    }
  })
  const renderStack = RenderStack(ssb)
  const renderTile = tileRenderStack.render
  const render = renderStack.render
  const self = {
    renderTile,
    render,
    use: r => {
      tileRenderStack.use(r)
      renderStack.use(r)
      return self
    }
  }
  return self
}
