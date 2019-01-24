import Dep from './Dep.js'

export default class Watcher {
  /**
   *
   * @param dj Dj实例
   * @param cb 回调函数,在这里就是渲染函数
   * @param expOrFn 表达式或者函数,即{{xxx}}中的xxx
   */
  constructor (dj, cb, expOrFn) {
    this.id = new Date().getTime().toString().slice(5, -1)
    this.cb = cb
    this.dj = dj
    /* 把getter创建一个函数 方便用于call调用 */
    this.getters = new Function(`return ${expOrFn}`)
    Dep.target = this
    this.value = this.get()
    if (this.cb) {
      this.cb.call(this.dj)
    }
  }

  /**
   * 执行渲染函数，得到新的界面
   */
  update () {
    // const value = this.get()
    // const oldValue = this.value
    // this.value = oldValue
    /* 触发回调得到新的值 */
    if (this.cb) {
      const value = this.get()
      const oldValue = this.value
      this.value = oldValue
      /* TODO: 未成功得到value */
      this.cb.call(this.dj, oldValue, value)
    }
  }

  /**
   * 执行getter操作得到新的值，实际触发依赖收集
   */
  get () {
    const dj = this.dj
    return this.getters.call(dj)
  }
}
