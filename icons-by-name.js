const pull = require('pull-stream')
const Images = require('tre-images')
const MutantMap = require('mutant/map')
const MutantArray = require('mutant/array')
const collectMutations = require('collect-mutations')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const ResolvePrototypes = require('tre-prototypes')
const h = require('mutant/html-element')

module.exports = function(ssb, config) {
  const resolvePrototypes = ResolvePrototypes(ssb)
  const renderImage = Images(ssb, {
    prototypes: config.tre.prototypes,
    renderCustomElement: ({src, width, height, ctx}) => {
      const o = {
        src, width, height,
        title: ctx.title || '',
      }
      if (ctx.action) {
        o['ev-click'] = e => {
          ctx.action(e, ctx)
        }
      }
      return h('img.tre-image-thumbnail', o)
    }
  })
  const icons = MutantArray()
  const o = {sync: true, live: true}
  const drain = collectMutations(icons, o)
  pull(
    ssb.revisions.messagesByBranch(config.tre.branches.icons, o),
    drain
  )
  const abort = drain.abort
  const resolved = MutantMap(icons, resolvePrototypes, {comparer})

  return function(name, ctx) {
    return computed(resolved, icons => {
      const kv = icons.find(kv => kv && kv.value.content.name == name)
      if (!kv) return []
      return renderImage(kv, ctx)
    })
  }
}

function comparer(a, b) {
  // NOTE: a and b might be observables 
  /*
  It might be beneficial to overall perofrmance to make a slightly deeper comparison of
  - keys
  - meta (wihtout prototype-chain)
  - keys of prototype chain

  It's not enough to just compare akey to b.key because changes in
  prototypes would slip through.
  */
  return a === b
}

