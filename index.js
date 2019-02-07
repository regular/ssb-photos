const Finder = require('tre-finder')
const PropertySheet = require('tre-property-sheet')
const StylePanel = require('tre-style-panel')
const Shell = require('tre-editor-shell')
const WatchMerged = require('tre-prototypes')
const {makePane, makeDivider, makeSplitPane} = require('tre-split-pane')
const h = require('mutant/html-element')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const setStyle = require('module-styles')('pho')
const RenderFonts = require('./render-fonts')
const MultiEditor = require('tre-multi-editor')
const Icons = require('./icons-by-name')

module.exports = function(ssb, config, opts) {
  const {importer, render} = opts

  styles()
  const renderFonts = RenderFonts(ssb, config)
  document.body.appendChild(renderFonts())

  const watchMerged = WatchMerged(ssb)
  const primarySelection = Value()
  const mergedKvObs = computed(primarySelection, kv => {
    const c = content(kv)
    if (!c) return
    return watchMerged(c.revisionRoot || kv.key)
  })

  const renderStylePanel = StylePanel(ssb)
  const iconByName = Icons(ssb, config)
  const renderFinder = Finder(ssb, {
    importer,
    skipFirstLevel: true,
    primarySelection,
    prolog: (kv, ctx) => {
      if (!kv) return []
      const meta = kv.meta
      return [
        h('div.indicators', [ 
          meta && meta["prototype-chain"] ? iconByName('gift', {title: 'Node has a prototype'}) : [],
          meta && meta.forked ? iconByName('git branch', {title: 'Node has multiple heads'}) : [],
          meta && meta.incomplete ? iconByName('alert', {title: 'Node has incomplete history'}) : [],
          meta && meta.change_requests ? iconByName('notifications', {title: 'Change requests'}) : []
        ])
      ]
    },
    details: (kv, ctx) => {
      if (!kv) return []
      return [
        h('div.actions', [ 
          //iconByName('add circle outline', {title: 'Add child node'}),
          iconByName('albums', {
            title: 'Clone',
            action: (e, ctx) => {
              e.preventDefault()
              const content = Object.assign({}, kv.value.content)
              delete content.revisionRoot
              delete content.revisionBranch
              content.name = `Copy of ${content.name}`
              console.log('Cloning', content)
              ssb.publish(content, (err, msg) => {
                if (err) return console.error(err.message)
                console.log('cloned. New message:', msg)
              })
            }
          }),
          iconByName('trash', {
            title: 'Move to trash',
            action: (e, ctx) => {
              e.preventDefault()
              ssb.revisions.patch(kv.key, content => {
                content.branch = config.tre.branches.trash
              }, (err, msg) => {
                if (err) return console.error(err.message)
                console.log('moved to trash', msg)
              })
            }
          }),
          //iconByName('more', {title: 'more ...'})
        ])
      ]
    }
  })
  const renderMultiEditor = MultiEditor(ssb, opts)

  const where = Value('editor')

  const modes = [   //    splitpane?  right?    editor?    fullscreen?
    {name: 'edit',        ui: true,  ri: true,  ed: true,  fs: false },
    {name: 'sidebar',     ui: true,  ri: true,  ed: false, fs: true  },
    {name: 'fullscreen',  ui: false, ri: false, ed: false, fs: true  },
    {name: 'overlay',     ui: true,  ri: false, ed: false, fs: true  }
  ]
  const mode = Value(0)

  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Tab' && e.shiftKey) {
      mode.set( (mode() + 1) % modes.length)
      console.log('new view mode:', modes[mode()].name)
      e.preventDefault()
    }
  })

  function renderStage() {
    return h('.pho-stage', {}, [
      computed(mergedKvObs, kv => {
        if (!kv) return []
        return render(kv)
      })
    ])
  }

  function display(obs) {
    return {
      display: computed(obs, s => s ? 'block' : 'none')
    } 
  }

  function renderSidebar() {
    return h('.pho-sidebar', {
    }, [
      makeSplitPane({horiz: false}, [
        makePane('50%', [
          renderFinder(config.tre.branches.root, {path: []})
        ]),
        makeDivider(),
        makePane('50%', [
          renderStylePanel()
        ])
      ])
    ])
  }

  function whenVisible(aspect, a, b) {
    return computed(mode, mode => modes[mode][aspect] ? a : b)
  }

  return h('.pho', {
    classList: computed(mode, mode => `viewmode-${[modes[mode].name]}`)
  }, [
    whenVisible('ri', [], whenVisible('fs', renderStage(), [])),
    h('.pho-ui', {
      style: { display: whenVisible('ui', 'block', 'none') }
    }, [
      makeSplitPane({horiz: true}, [
        makePane('25%', [renderSidebar()]),
        makeDivider(),
        makePane('70%',/* {
          style: {opacity: whenVisible('ri', 1, 0)}
        },*/ [
          whenVisible('fs', renderStage(), []),
          h('div.pho-editor', {
            style: {display: whenVisible('ed', 'block',  'none')}
          }, computed(renderFinder.primarySelectionObs, kv => {
            if (!kv) return []
            return renderMultiEditor(kv, {render})
          }))
        ])
      ])
    ])
  ])
}

function content(kv) {
  return kv && kv.value && kv.value.content
}

function unmergeKv(kv) {
  // if the message has prototypes and they were merged into this message value,
  // return the unmerged/original value
  return kv && kv.meta && kv.meta['prototype-chain'] && kv.meta['prototype-chain'][0] || kv
}
function revisionRoot(kv) {
  return kv && kv.value.content && kv.value.content.revisionRoot || kv && kv.key
}

function styles() {
  setStyle(`
    body, html, .pho, .pho-ui, .pho-stage, .tre-multi-editor {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      --tre-selection-color: green;
      --tre-secondary-selection-color: yellow;
      font-family: sans-serif;
    }
    .pho {
      position: relative;
    }
    .pho-sidebar {
      height: 100%;
    }
    .tre-style-panel {
      height: 100%;
    }
    .pho.viewmode-overlay > .pho-ui {
      opacity: 0.7;
      position: absolute;
      z-index: 2;
      top: 0;
    }
    .pho.viewmode-overlay > .pho-ui > .horizontal-split-pane > .pane:nth-child(3) {
      opacity: 0;
    }
    h1 {
      font-size: 18px;
    }
    .pane {
      background: #eee;
    }
    .tre-finder .summary select {
      font-size: 9pt;
      background: transparent;
      border: none;
      width: 50px;
    }
    .tre-finder summary {
      white-space: nowrap;
    }
    .tre-finder summary:focus {
      outline: 1px solid rgba(255,255,255,0.1);
    }
    .tre-property-sheet {
      font-size: 9pt;
      background: #4a4a4b;
      color: #b6b6b6;
      height: 100%;
    }
    .tre-property-sheet summary {
      font-weight: bold;
      text-shadow: 0 0 4px black;
      margin-top: .3em;
      padding-top: .4em;
      background: #555454;
      border-top: 1px solid #807d7d;
      margin-bottom: .1em;
    }
    .tre-property-sheet input {
      background: #D0D052;
      border: none;
      margin-left: .5em;
    }
    .tre-property-sheet .inherited input {
      background: #656464;
    }
    .tre-property-sheet .new input {
      background: white;
    }
    .tre-property-sheet details > div {
      padding-left: 1em;
    }
    .tre-property-sheet [data-schema-type="number"] input {
      width: 4em;
    }
    .property[data-schema-type=string] {
      grid-column: span 3;
    }
    .tre-property-sheet .properties {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fill, 5em);
    }
    .tre-property-sheet details {
      grid-column: 1/-1;
    }
    .tre-folders {
      background-color: #777;
    }
    .tre-folders .tile {
      border: 1px solid #444;
      background: #666;
    }
    .tre-folders .tile > .name {
      font-size: 9pt;
      background: #444;
      color: #aaa;
    }
    .tile>.tre-image-thumbnail {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
    }
  `)
}
