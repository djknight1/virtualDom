const path = require('path')
const webpack = require('webpack');//引入webpack

module.exports = {
  //入口文件的配置项
  entry:{
    a: './src/index.js',
    b: './src/refresh.js',
    c: './src/Dj/Dj.js',
    d: './src/Watcher.js',
    e: './src/Dep.js'
  },
  output:{
    //打包的路径
    publicPath:'/dist',//必须加publicPath
    path:path.resolve(__dirname,'dist'),
    //打包的文件名称
    filename:'./js/[name].bundle.js'
  },
  devServer:{
    host:'localhost',
    port:'8080',
    open:true, //自动拉起浏览器
    hot:true,//热加载
  //hotOnly:true
  },
  plugins:[
    //热更新插件
    new webpack.HotModuleReplacementPlugin()
  ],
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.styl$/,
        loader: 'style-loader!css-loader!stylus-loader'
      }
    ]
  }
};
