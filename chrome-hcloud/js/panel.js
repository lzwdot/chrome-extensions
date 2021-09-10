// 全局html
let globalHtml = getAppHtml()
let globalNum = 0

// 搞个搜索功能
document.getElementById('search').addEventListener('input', (e) => {
  const {html: newHtml, number} = textSearch(e.target.value, globalHtml)

  globalNum = 0
  document.getElementById('app').innerHTML = newHtml
  document.getElementById('number').innerHTML = number ? `${globalNum}/${number}` : 0
})

// 监听 enter 键
window.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    const matchs = document.getElementsByClassName('match')
    const length = matchs.length
    if (globalNum >= length) return

    window.scrollTo(0, matchs[globalNum].offsetTop - 50)
    document.getElementById('number').innerHTML = `${++globalNum}/${length}`
  }
})

// 注册回调，每一个http请求响应后，都触发该回调
const network = chrome.devtools.network
network.onRequestFinished.addListener(async (...args) => {
  try {
    const [{
      // 请求的类型，查询参数，以及url
      request: {method, queryString, url},

      // 该方法可用于获取响应体
      getContent,
    }] = args;

    if (url.includes('basedata/form/detail')) {
      // 将callback转为await promise
      // warn: content在getContent回调函数中，而不是getContent的返回值
      const content = await new Promise((res, rej) => getContent(res));

      // 判断是否 JSON
      if (!isJson(content)) return
      const data = JSON.parse(content).data

      // 获取表单字段
      getField(data)

      // 获取按钮字段
      getButton(data)

      // 代码高亮
      Prism.highlightAll()

      // 获取全局 html
      globalHtml = getAppHtml()
    }
  } catch (err) {
    console.log(err.stack || err.toString())
  }
})

/**
 * 用于 html 页面搜索
 * @param keyword
 * @param html
 * @returns {*}
 */
function textSearch(keyword, html) {
  //删除注释
  const _html = html.replace(/<!--(?:.*)\-->/g, "");

  //将HTML代码支离为HTML片段和文字片段，其中文字片段用于正则替换处理，而HTML片段置之不理
  const strReg = /[^<>]+|<(\/?)([A-Za-z]+)([^<>]*)>/g;

  let newHtml = _html.match(strReg);
  let number = 0

  newHtml.forEach(function (item, i) {
    if (!/<(?:.|\s)*?>/.test(item)) {//非标签
      //开始执行替换
      const keyReg = new RegExp(regTrim(keyword), "g");
      if (keyword && keyReg.test(item)) {
        //正则替换
        newHtml[i] = item.replace(keyReg, '<span class="match">' + keyword + '</span>');
        number++
      } else {
        newHtml[i] = item.replace('class="match"', '');
      }
    }
  });

  //将支离数组重新组成字符串
  newHtml = newHtml.join("")
  return {html: newHtml, number}

  //字符串正则表达式关键字转化
  function regTrim(s) {
    var imp = /[\^\.\\\|\(\)\*\+\-\$\[\]\?]/g;
    var imp_c = {};
    imp_c["^"] = "\\^";
    imp_c["."] = "\\.";
    imp_c["\\"] = "\\\\";
    imp_c["|"] = "\\|";
    imp_c["("] = "\\(";
    imp_c[")"] = "\\)";
    imp_c["*"] = "\\*";
    imp_c["+"] = "\\+";
    imp_c["-"] = "\\-";
    imp_c["$"] = "\$";
    imp_c["["] = "\\[";
    imp_c["]"] = "\\]";
    imp_c["?"] = "\\?";
    s = s.replace(imp, function (o) {
      return imp_c[o];
    });
    return s;
  };
}

/**
 * 返回全局 html
 * @returns {string}
 */
function getAppHtml() {
  return document.getElementById('app').innerHTML
}

/**
 * 判断是否 JSON
 * @param str
 * @returns {boolean}
 */
function isJson(str) {
  try {
    const json = JSON.parse(str)
    if (typeof json === 'object' && json) {
      return true
    }
    return false
  } catch (e) {
    return false
  }
}

/**
 * 获取字段解析
 * @param data
 */
function getField(data) {
  if (!data) return

  //标题
  const title = data.title
  const formSet = data.form[0].set

  // 主表单
  let formCode = `// ${title}\n`
  formCode += `const FORM_KEY = '${formSet[0].entityName}__' \n`
  formCode += 'const formKyes = {\n'
  for (let i = 0; i < formSet.length; i++) {
    const field = formSet[i]
    if (field.alias) formCode += `   ${field.alias}:` + ' `${FORM_KEY}' + `${field.alias}\` , //${field.title}\n`
  }
  formCode += '} \n'

  // 明细表单
  let tableCode = ''
  for (let i = 0; i < formSet.length; i++) {
    const outSet = formSet[i]
    if (outSet.typeSet.head) {
      let tableTitle = outSet.typeSet.head[0].title
      let tableSet = outSet.typeSet.head[0].set

      tableCode += `// ${tableTitle} \n`
      tableCode += `const tFORM_KEY_${tableSet[0].alias} = '${tableSet[0].entityName}__' \n`
      tableCode += `const tFormKyes_${tableSet[0].alias} = { \n`
      for (let i = 0; i < tableSet.length; i++) {
        const field = tableSet[i]
        if (field.alias) tableCode += `   ${field.alias}:` + ' `${tFORM_KEY_' + `${tableSet[0].alias}` + '}' + `${field.alias}\` , // ${field.title}`
        if (field.typeSet && field.typeSet.data) {
          for (let i = 0; i < field.typeSet.data.length; i++) {
            const type = field.typeSet.data[i]
            tableCode += ` ${type.value}：${type.label}，`
          }
        }
        tableCode += '\n'
      }
      tableCode += '} \n'
    }
  }

  document.getElementById('getTitle').innerHTML = title
  document.getElementById('getField').innerHTML = formCode + tableCode
}

/**
 * 获取按钮字段
 * @param data
 */
function getButton(data) {
  if (!data) return

  // 按钮
  const btns = data.oButton.inside
  let btnCode = ''
  for (let i = 0; i < btns.length; i++) {
    const btn = btns[i]
    btnCode += `${btn.key} // ${btn.name} \n`
  }

  document.getElementById('getButton').innerHTML = btnCode
}

