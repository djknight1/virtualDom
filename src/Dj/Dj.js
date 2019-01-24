import parse from '../index.js'
import Dep from '../Dep.js'
import Watcher from "../Watcher";
window.Dj = class Dj {
  constructor(options) {
    this.isInit = true
    let {data, template, el} = options
    this.template = template
    this.data = data
    observe(this.data, options.callback)
    proxy.call(this, data)
    this.vdom = parse.call(this, this.template.trim())
    document.querySelector(el).appendChild(this.vdom.render())
    let watcher = new Watcher(this, )
  }

  generator (tokens) {
    let str = ''
    for (let item of tokens) {
      if (item && item.binding) {
        new Watcher(this, (val, newVal) => {
          console.log(val, newVal)
          item.binding = eval(item.binding)
        }, item.binding)
        str += item.binding
      } else {
        str +=item
      }
    }
    return str
  }
}

function observe(value, cb) {
  Object.keys(value).forEach((key) => {
    defineReactive(value, key, value[key], cb)
  })
}

/*
* data: {
*   a: 1,
*   b: 2
* }
* */
function defineReactive(obj, key, val, cb) {
  const dep = new Dep()
  let childObj // 这个是给新加的属性也添加响应式
  const property = Object.getOwnPropertyDescriptor(obj, key)
  /* 得到每个属性的defineProperty的设置值 */
  if (property && property.configurable === false) {
    return
  }

  const getter = property && property.get
  const setter = property && property.set

  Object.defineProperty(obj, key, {
    // 对每一个属性进行设置getter和setter
    enumerable: true,
    configurable: true,
    get: () => {
      /* 得到原来的val */
      const value = getter ? getter.call(obj) : val

      if (Dep.target) {
        dep.addSub(Dep.target)
        if (childObj) {
          childObj.dep.addSub(Dep.target)
        }
      }
      console.log(dep, key)
      return value
    },
    set: newVal => {
      const value = getter ? getter.call(obj) : val
      /* 如果与原来的值一致则return */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      val = newVal
      childObj = observe(newVal)
      dep.notify()
    }
  })
}

// 进行代理

function proxy(data) {
  // 用call在Dj类内调用proxy
  let me = this
  Object.keys(data).forEach((key) => {
    Object.defineProperty(me, key, {
      enumerable: true,
      configurable: true,
      get: function proxyGetter() {
        return me.data[key]
      },
      set: function proxySetter(val) {
        me.data[key] = val;
      }
    })
  })
}

/* TODO:代理编写完成, 下一步写更改属性值后, 通过依赖收集等方法, 通知所有订阅者更新Vdom并再次渲染 */
