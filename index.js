function produce(base, producer) {
  const state = new State(base)
  const proxy = new Proxy(state, Handler)

  producer(proxy)
  return finalize(proxy.state)
}

class State {
  constructor(base) {
    this.source = base
    this.modified = false
    this.copy = null
  }
  get(key) {
    if (!this.copy) {
      return this.source[key]
    } else {
      return this.copy[key]
    }
  }
  set(key, val) {
    if (!this.modified) {
      this.copy = { ...this.source }
      this.modified = true
    }
    this.copy[key] = val
  }
}

const Handler = {
  get(target, key) {
    if (key === 'state') {
      return target
    }
    return target.get(key)
  },
  set(target, key, val) {
    target.set(key, val)
  }
}

function finalize(state) {
  if (state.modified) {
    return state.copy
  }
  return state.source
}

//------------测试

const obj = {
  a: 1,
  b: {
    c: 3
  }
}

const result = produce(obj, (d => d.a = 6))

console.log(result)