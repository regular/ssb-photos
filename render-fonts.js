const pull = require('pull-stream')
const Fonts = require('tre-fonts')
const MutantMap = require('mutant/map')
const MutantArray = require('mutant/array')
const collectMutations = require('collect-mutations')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const ResolvePrototypes = require('tre-prototypes')
const h = require('mutant/html-element')

module.exports = function(ssb, config) {
  const resolvePrototypes = ResolvePrototypes(ssb)
  const renderFont = Fonts(ssb, {
    prototypes: config.tre.prototypes
  })
  return function() {
    const fonts = MutantArray()
    const o = {sync: true, live: true}
    const drain = collectMutations(fonts, o)
    pull(
      ssb.revisions.messagesByType('font', o),
      drain
    )
    const abort = drain.abort
    const resolved = MutantMap(fonts, resolvePrototypes, {comparer})

    return h('.tre-fonts', {
      hooks: [el => abort],
    }, MutantMap(resolved, kvm => {
      const hasFiles = computed(kvm, kvm => Boolean(
        kvm &&
        kvm.value.content.files &&
        kvm.value.content.files.length && 
        kvm.value.content.files[0].size))
      return computed(hasFiles, f => f ? renderFont(kvm(), {where: 'stage'}) : [])
    }, {comparer}))
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

