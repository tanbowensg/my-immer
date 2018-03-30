const PROXY_STATE = Symbol('immer-proxy-state')

function produce(baseState, producer) {
  const proxy = createProxy(undefined, baseState)

  producer(proxy)

  const result = finalize(proxy)

  return result
}

function createState(parent, base) {
  return {
    modified: false,
    parent,
    base,
    copy: {},
    proxies: {}
  }
}

// get 里面虽然分了修改过和未修改过的逻辑，但是两者共通的目的是把所访问过的对象，都转换成 proxy。
// 如果没访问过，就保持对象原样不变
// proxies 可以理解为暂时的 copy。在state修改过以后，proxies就没有意义了，会被合并入 copy 中。
// 如果 state 没有修改过，那么自然也就不需要 copy，proxies 里的代理最后也用不到。 

// proxy 的作用主要是劫持 get 和 set 的操作。并且在 get 的时候一步步把属性都转换成 proxy。

function createProxy(parent, base) {
  const state = createState(parent, base)
  const handler = {
    get(state, key) {
      if (key === PROXY_STATE) {
        // 如果要的是state，直接给 state
        return state
      }
      if (state.modified) {
        // 如果state已经修改过了，那就从 copy 中找到对应的值
        const value = state.copy[key]
        if (value === state.base[key] && isProxyable(value)) {
          // 如果 copy 中的值和 base 一样，而且可以转换成 proxy，就转换成 proxy
          state.copy[key] = createProxy(state, value)
          return state.copy[key]
        }
        return value
      } else {
        if (has(state.proxies, key)) {
          // 如果 state 没有修改过，而且要访问的值已经有 proxy ，那就直接返回这个 proxy
          return state.proxies[key]
        }
        const value = state.base[key]
        if (!isProxy(value) && isProxyable(value)) {
          // 如果state没有修改过，而且要访问的值是一个对象
          // 那么就把这个值转换为 proxy，保存起来，并且返回这个 proxy
          // 此时就创建了这个对象的代理，之后对这个对象的访问也会通过代理了
          state.proxies[key] = createProxy(state, value)
          return state.proxies[key]
        } else {
          // 如果state没有修改过，而且要访问的值不是对象，就直接返回
          return value
        }
        
      }
    },
    set(state, key, value) {
      if (!state.modified) {
        if (
          (key in state.base && is(state.base[key], value)) ||
          (has(state.proxies, key) && state.proxies[key] === value)
        )
          // 如果要修改的值已经在base中有了，而且新值和旧值一样，或者要修改的值已经有proxy了，并且新值和旧值一样
          // 那就什么都不做
          return true
        markChanged(state)
      }
      // 把新值保存到 copy 中
      state.copy[key] = value
      return true
    }
  }
  return new Proxy(state, handler)
}

function markChanged(state) {
  if (!state.modified) {
    state.modified = true
    // 把当前对象进行浅复制，之后要修改值，就改 copy 中的，这样就不会影响原来的对象了
    state.copy = { ...state.base }
    // 把 proxy 合并到 copy 中
    Object.assign(state.copy, state.proxies) // yup that works for arrays as well
    // 依次往上，把父级也标记成修改过
    if (state.parent) markChanged(state.parent)
  }
}

function finalize(proxy) {
  const state = proxy[PROXY_STATE]
  if (state.modified === true) {
    const keys = Object.keys(state.copy)
    const obj = {}
    keys.forEach(key => {
      const val = state.copy[key]
      if (isProxy(val)) {
        obj[key] = finalize(val)
      } else {
        obj[key] = val
      }
    })
    return obj
  } else {
      return state.base
  }
}

function isProxyable(value) {
  if (!value) return false
  if (typeof value !== "object") return false
  if (Array.isArray(value)) return true
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

function is(x, y) {
  // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
  if (x === y) {
      return x !== 0 || 1 / x === 1 / y
  } else {
      return x !== x && y !== y
  }
}

function has(thing, prop) {
  return Object.prototype.hasOwnProperty.call(thing, prop)
}

function isProxy(value) {
  return !!value && !!value[PROXY_STATE]
}

module.exports = produce
