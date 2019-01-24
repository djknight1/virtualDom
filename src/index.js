import {isUnaryTag, isNonPhrasingTag, Element} from './util/util'
import Watcher from './Watcher.js'
import {patch} from "./diff/diff"
import '../style/base.styl'
// 匹配属性
const attribute = /^\s*([^\s"'<>\\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 匹配开始标签开始部分
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配开始标签结束部分
const startTagClose = /^\s*(\/?)>/
// 匹配结束标签
const endTag = new RegExp(`^<\/${qnameCapture}[^>]*>`)
// 匹配注释
const comment = /^<!--/
// 匹配默认的分隔符 "{{}}"
const defaultTagRE = /\{\{((?:(.)|\n)+?)\}\}/g
function parse(template) {
  let root // 根节点, 只设置一次
  let vm = this
  let currentParent // 父节点, 一开始为空
  let AstStack = []
  parseHtml(template, {
    /* 处理开始标签 */
    start (tagName, attrs, isUnary) {
      let element = createASTElement(tagName, attrs, currentParent)
      if (!root) {
        root = element
      }
      if (currentParent) {
        currentParent.children.push(element)
        element.parent = currentParent
      }
      // 是非闭合的,把它入栈并作为currentParent
      if (!isUnary) {
        AstStack.push(element)
        currentParent = element
      }
      // 否则是闭合的, 不做处理就行
    },
    /* 处理结束的标签, 把它出栈就好 */
    end () {
      AstStack.pop()  // 还会把长度减一
      currentParent = AstStack[AstStack.length - 1]
    },
    char (text) {
      let res
      if (!currentParent) { // char的情况都没有currentParent
        console.error('你没有根元素！')
      } else {
        const children = currentParent.children
        if (res = parseText.call(vm, text)) {
          children.push({
            type: 3,
            expression: res.expression,
            token: res.tokens
          })
        } else {
          children.push({
            type: 3,
            text
          })
        }
      }
    },
    comment (text) {
      if (currentParent) {
        currentParent.children.push({
          type: 3,
          text,
          isComment: true
        })
      }
    }
  })
  return new Element(root, this)
}

function parseText(text) {
  if (!defaultTagRE.test(text)) {
    return
  }

  /* TODO: 学习Reg.exec()的用法 */
  const tokens = []
  const rawTokens = [];

  let lastIndex = defaultTagRE.lastIndex = 0;
  let index;
  let match;
  // 循环匹配本文中的表达式
  while(match = defaultTagRE.exec(text)) {
    index = match.index;
    if (index > lastIndex) {
      let value = text.slice(lastIndex, index);
      tokens.push(JSON.stringify(value));
      rawTokens.push(value)
    }
    // 此处需要处理过滤器，暂不处理，s请查看源码
    let exp = match[1].trim();
    /* 这里不能用* 否则会把每个字符串后的空字符串也匹配进去 */
    let test = /([^+\-*\/\s]+)/g
    exp = exp.replace(test, 'this.$1')
    tokens.push(exp);
    rawTokens.push({'binding': exp})
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    let value = text.slice(lastIndex);
    tokens.push(JSON.stringify(value));
    rawTokens.push(value);
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}


function parseHtml(template, options) {
  let html = template //剩下的html
  let opt = options
  let index = 0  //解析的索引
  let lastTag // 相当于栈顶指针,不过是用tagName来做栈顶指针的
  let checkStack = []
  while (html) {
    let textStart = html.indexOf('<')
    if (textStart === 0) {
      // 以<开头
      if (html.match(comment)) {
        // 说明是注释开头
        let commentEnd = html.indexOf('-->')
        if (commentEnd >= 0) {
          if (opt.comment) {
            opt.comment(html.substring(4, commentEnd))  // 保存注释 <!--四个字符
          }
        }
        advance(commentEnd + 3)
        continue
      }

      const startTagMatch = parseStartTag();
      if (startTagMatch) {
        handleStartTag(startTagMatch)
      }
      /* 把带空格和纯文本放一起讨论 把空格和文本都设成text 传入char */
      // 如果匹配到结尾标签
      const endTagMatch = html.match(endTag)  // 匹配到的是</div>之类的 有可能匹配到</br>
      if (endTagMatch) {
        advance(endTagMatch[0].length)
        parseEndTag(endTagMatch[1])
      }
    }
    let text
    if (textStart >= 0) {
      // 说明标签和标签中间有文本
      text = html.slice(0, textStart)  // 从<位置截取剩下的
      advance(textStart)
    }
    if (textStart < 0) {
      // 没有<, 说明整个html都是纯文本
      text = html
      html = ''
    }
    if (opt.char) {
      opt.char(text)
    }
  }

  function advance (n) {
    index += n
    html = html.substring(n)
  }

  function parseEndTag(tagName) {
    /*
    * 对endTag通过checkStack进行匹配, 如果匹配到了则出栈, 维护栈顶指针,并调用end方法
    * */
    if (tagName) {
      // 开始再checkStack中匹配
      tagName = tagName.toLowerCase()
      let pos
      for (pos = checkStack.length - 1; pos>=0; pos--) {
        if (checkStack[pos].tagName === tagName) {
          break
        }
      }
      // 匹配成功, 但是不一定匹配正确, 只有栈顶元素和你匹配成功才算正确
      if (pos >= 0) {
        let i = checkStack.length - 1
        if (i > pos) {
          // 匹配错误!
          console.error(`tag<${checkStack[i - 1].tagName}没有匹配的end tag`)
        }
        // 否则, 匹配成功, 调用end函数把它从AST栈中弹出
        opt.end()
        // 还要从checkStack中弹出
        checkStack.length = pos
        lastTag = checkStack[pos - 1].tagName
      } else if (tagName === 'br') {
        // 没有匹配到, 说明是</br>一类的标签
        if (opt.start) {
          // 把br与父节点连接起来
          opt.start(tagName, [], true)
        }
      }
    }
  }

  function parseStartTag() {
    const start = html.match(startTagOpen)
    if (start) {
      let match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        // 如果匹配不到/>或> 但能匹配到属性, 说明它有属性,把属性push进attrs
        match.attrs.push(attr)
        advance(attr[0].length)
      }
      if (end) {
        match.isUnary = end[1] // 是自闭合的就是/ 非自闭和的就是空
        match.end = index
        advance(end[0].length)
        return match
      }
    }
  }

  function handleStartTag(match) {
    // 分成三部分
    /*
    * 1: 格式化attr
    * 2: 把标签入栈,方便匹配
    * 3: 调用start函数,创建AST
    * */
    let tagName = match.tagName
    let unaryTag = match.isUnary
    let attrs = []
    attrs.length = match.attrs.length //进行深拷贝
    for (let i = 0; i < attrs.length; i++) {
      attrs[i] = {
        name: match.attrs[i][1],
        // attrs3，4，5都有可能有值 但是不可能一起有。因为可能是双引号或单引号或什么都没有
        value: match.attrs[i][3] || match.attrs[i][4] || match.attrs[i][5]
      }
    }
    // 判断是否闭合标签, 如果是自闭和的, 那么不入checkStack栈
    let isUnary = isUnaryTag(tagName) || !!unaryTag
    if (!isUnary) {
      checkStack.push({
        tag: tagName,
        attrs,
        lowerCaseTag: tagName.toLowerCase()
      })
    }

    if (opt.start) {
      opt.start(tagName, attrs, isUnary)
    }
  }
}

function parseKey (tag, attrsMap) {
  let key = tag
  for (let value of Object.values(attrsMap)) {
    key += `.${value}`
  }
  return key
}

function createASTElement (tag, attrs, parent) {
  let attrsMap = {}
  for (let i = 0, len = attrs.length; i < len; i++) {
    attrsMap[attrs[i].name] = attrs[i].value
  }
  return {
    type: 1,
    tag,
    key: parseKey(tag, attrsMap),
    attrsList: attrs,
    attrsMap: attrsMap,
    parent,
    children: []
  }
}

/*
let click = document.getElementById('click')
let container = document.getElementsByClassName('container')[0]
let root = parse(template.trim())
click.onclick = () => {
  container.appendChild(root.render())
}*/

export default parse

/*const template = `
<div id="refresh-container" class="refresh-container">
      <div id="icon" class="refresh-icon">
      {{a+b}} {{c}}
        <canvas width="60" height="60" id="canvas"></canvas>
      </div>
   </div>
`*/
/*const test = `
<div id="refresh-container" class="refresh-container">
      <div id="icon" class="refresh-icon">
        <canvas></canvas>
      </div>
    </div>
`*/
// let templateTest = parse(template.trim())
// templateTest.el = templateTest.render()
// initEl(templateTest)
// console.log(templateTest)

// let Test = parse(test.trim())
// console.log(patch(templateTest, Test))

function initEl(templateTest) {
  if (templateTest.children) {
    templateTest.children.forEach((children) => {
      if (children.type === 1) {
        children.el = new Element(children).render();
      }
      let grandSon = children.children
      if (grandSon) {
        initEl(children)
      }
    })
  }
}
