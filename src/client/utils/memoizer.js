const MAX_KEYS = 10

export function memoize (fn) {
    const cache = {}
    const keys = []
    return function(...args) {
        const key = JSON.stringify(args)
        if (cache[key]) {
            keys.splice(keys.indexOf(key), 1)
            keys.push(key)
            return cache[key]
        }
        const result = fn(...args)
        cache[key] = result
        keys.push(key)

        if (keys.length > MAX_KEYS) {
            delete cache[keys.shift()]
        }

        return result
    }
}