import webpack from 'webpack'
import configs from '../app/webpack.development'

const rendererConfig = configs[1]
console.log('Starting single-target renderer compilation...')
webpack(rendererConfig, (err, stats) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  if (stats && stats.hasErrors()) {
    console.error(stats.toString('errors-only'))
    process.exit(1)
  }
  console.log('Renderer compilation completed successfully!')
  process.exit(0)
})
