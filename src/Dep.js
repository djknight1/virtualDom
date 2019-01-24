/*
* Dep 是一个发布者模型
* */
export default class Dep {
  constructor () {
    this.subs = []
    this.subsId = new Set()
  }

  /***
   * @param watcher 是Watcher类对象 即订阅者
   */
  addSub(watcher) {
    if (!this.subsId.has(watcher.id)) {
      this.subs.push(watcher)
      this.subsId.add(watcher.id)
    }
  }

  /**
   * @param watcher
   */
  removeSub(watcher) {
    remove(this.subs, watcher)
  }
  notify () {
    const subs = this.subs
    for (let i = 0; i< subs.length; i++) {
      subs[i].update()
    }
  }
}

function remove(list, item) {
  let index = list.indexOf(item)
  if (index > -1) {
    list.splice(index, 1);
  } else {
    console.error(`no such item!${item}`)
  }
}

Dep.target = null
