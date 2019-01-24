/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Djknight
 *
 */
import {api} from "../util/api";
import {Element} from "../util/util";

function sameVnode(a, b) {
  return (
    a.key === b.key && a.tag === b.tag)
}

/* patch之前Vnode的el都是undefined */
export function patch(oldVnode, Vnode) {
  if (sameVnode(oldVnode, Vnode)) {
    // 如果两个是同样的节点, 即可比,就进行patchNode
    patchNode(oldVnode, Vnode)
  } else {
    // 他们不是可比的对象,即妥协新节点,把旧节点删除
    const oEle = oldVnode.el
    let parentEle = api.parentNode(oEle)
    Vnode.el = new Element(Vnode, this).render()
    if (parentEle !== null) {
      /* 把OldElement替换成新的Vnode */
      api.insertBefore(parentEle, Vnode.el, api.nextSibling(oEle))
      api.removeChild(parentEle, oEle)
      oldVnode = null
    }
  }
  return Vnode
}

function patchNode(oldVnode, Vnode) {
  const el = Vnode.el = oldVnode.el // 让Vnode.el引用到之前oldVnode的真实dom
  let i, oldCh = oldVnode.children, ch = Vnode.children
  // 五种情况, 分别来考虑

  if (oldVnode === Vnode) return // 如果两个的元素相同, 则说明完全没变,不用diff
  if (oldVnode.text !== null && Vnode !== null && oldVnode.text !== Vnode.text) {
    // 文本节点的比较, 如果有text说明该节点完全是文本节点
    api.setTextContent(el, Vnode.text)
  } else {
    updateEle(el, Vnode, oldVnode)
    if (oldCh && ch && oldCh !== ch) {
      updateChildren(el, oldCh, ch)
    } else if (ch) {
      Vnode.el = new Element(Vnode, this).render()
    } else if (oldCh) {
      api.removeChildren(el)
    }
  }
}

function updateChildren(el, oldCh, ch) {
  let newStartIdx = 0, oldStartIdx = 0
  let newEndIdx = ch.length - 1, oldEndIdx = oldCh.length - 1
  let newStartVnode = ch[0], oldStartVnode = oldCh[0]
  let newEndVnode = ch[newEndIdx], oldEndVnode = oldCh[oldEndIdx]
  let oldNodeMap, idxOnMap
  let before
  while (newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
    if (oldStartVnode === null) {
      // oldStartNode节点为空
      oldStartVnode = oldCh[++oldStartIdx]
    } else if (oldEndVnode === null) {
      oldEndVnode = oldCh[--oldEndVnode]
    } else if (newStartVnode == null) {
      newStartVnode = ch[++newStartIdx]
    } else if (newEndVnode == null) {
      newEndVnode = ch[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchNode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = ch[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchNode((oldEndVnode, newEndVnode))
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = ch[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // 说明第一个跑到最后去了
      patchNode((oldStartVnode, newEndVnode))
      api.insertBefore(el, oldStartVnode.el, api.nextSibling(oldEndVnode.el))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = ch[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // 说明最后一个跑到前面去了
      patchNode((oldEndVnode, newStartVnode))
      api.insertBefore(el, oldEndVnode.el, api.nextSibling(newStartVnode.el))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = ch[--newEndIdx]
    }
    else {
      // 所有无key的情况都判断完成 开始判断有key的情况
      if (oldNodeMap === undefined) {
        // 只创建一次key表, 且有需要的时候再创建
        oldNodeMap = createOldNodeMap(oldCh, oldStartIdx, oldEndIdx)
      }
      idxOnMap = oldNodeMap[newStartVnode.key]
      if (!idxOnMap) {
        console.log(oldStartVnode)
        api.insertBefore(el, oldStartVnode.el, api.nextSibling(oldStartVnode.el))
        newStartVnode = ch[++newStartIdx]
      } else {
        let eleToMove = oldCh[idxOnMap]
        /* 找到之后采取就地复用策略 */
        patchNode(eleToMove, newStartVnode)
        oldNodeMap[idxOnMap] = null
        api.insertBefore(el, eleToMove.el, api.nextSibling(eleToMove.el))
        newStartVnode = ch[++newStartIdx]
      }
    }
  }

  if (oldStartIdx > oldEndIdx) {
    before = ch[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].el
    addVnodes(el, before, ch, newStartIdx, newEndIdx)
  }else if (newStartIdx > newEndIdx) {
    removeVnodes(el, oldCh, oldStartIdx, oldEndIdx)
  }
}

function createOldNodeMap(children, StartIdx, EndIdx) {
  let i, map = {}, key, ch
  for (i = 0; i < children.length; i++) {
    ch = children[i]
    if (ch) {
      key = ch.key
      if (key) {
        map[key] = i
      }
    }
  }
  return map
}

export function updateEle (e ,vdom, oldVdom) {
  let i
  // if( (i = vdom.className).length > 0 ) api.setClass(e, i)
  if( (i = vdom.props) !== null ) api.setAttrs(e, i)
  //if( (i = vdom.id) !== null ) api.setId(e, i)
  if( (i = vdom.children) !== null && !oldVdom) api.appendChildren(e, i)
}

function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
  for ( ;startIdx <= endIdx; ++startIdx) {
    let ch = vnodes[startIdx]
    if (ch != null) {
      api.removeChild(parentElm, ch.el)
    }
  }
}
function addVnodes (parentElm, before, vnodes, startIdx, endIdx) {
  for ( ;startIdx <= endIdx; ++startIdx) {
    let ch = vnodes[startIdx]
    if (ch != null) {
      api.insertBefore(parentElm, new Element(ch, this).render(), before)
    }
  }
}

