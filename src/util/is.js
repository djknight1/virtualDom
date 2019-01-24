function judge (o) {
  return Object.prototype.toString.call(o)
}

export function isArray (arr) {
  return judge(arr) === '[object Array]'
}

export function isObject (o) {
  return judge(o) === '[object Object]'
}
