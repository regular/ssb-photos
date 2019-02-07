const {client} = require('tre-client')
const Importer = require('tre-file-importer')
const h = require('mutant/html-element')
const setStyle = require('module-styles')('tre-images-demo')
const TwoRenderStacks = require('./two-render-stacks')
const Pho = require('.')
require('brace/theme/solarized_dark')

const Images = require('tre-images')
const Fonts = require('tre-fonts')
const Stylesheets = require('tre-stylesheets')
const Folders = require('tre-folders')

const Icons = require('./icons-by-name')

client( (err, ssb, config) => {
  if (err) return console.error(err)

  const importer = Importer(ssb, config)
          .use(Images)
          .use(Fonts)
          .use(Stylesheets)
          .use(Folders)

  const prototypes = config.tre.prototypes

  const renderStack = TwoRenderStacks(ssb)
  const {render, renderTile} = renderStack
  const renderImage = Images(ssb, {
    prototypes
  })
  const renderFont = Fonts(ssb, {
    prototypes
  })
  const renderStylesheet = Stylesheets(ssb, {
    prototypes
  })
  const renderFolder = Folders(ssb, {
    prototypes,
    renderTile
  })

  const iconByName = Icons(ssb, config)

  renderStack
    .use(renderImage)
    .use(renderFont)
    .use(renderStylesheet)
    .use(renderFolder)
    .use(function(kv, ctx) {
      if (!kv) return
      if (kv.value.content.type !== 'folder') return
      if (ctx.where !== 'tile') return
      return iconByName('folder open', ctx)
    })

  document.body.appendChild(Pho(ssb, config, {
    ace: {
      theme: 'ace/theme/solarized_dark',
    },
    importer,
    render
  }))
})

