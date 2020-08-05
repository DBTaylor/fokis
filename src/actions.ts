export type Action<S> = 
    | Partial<S>
    | Promise<Action<S>>
    | ((s: S) => Action<S>)
    | Action<S>[]

export type Setter<S> = (f: (s: S) => S) => unknown

export type UnboundAction<S, Args extends any[]> = ((...args: Args) => Action<S>)

export type UnboundActions<S> = All<UnboundAction<S, any[]>>

export const merge = <T, U>(t: T, u: U): T & U => {
    if(typeof u == "object"){
        const obj = Object.assign({}, t)
        return Object.assign(obj, u)
    }else
        return u as any
}

export const handleRes = <S>(s: S, res: Action<S>, setter: Setter<S>): S => {
    if (Array.isArray(res)){
        const a = res.shift()
        if(a){
            setTimeout(() => executeAction(setter, res), 0)
            return handleRes(s, a, setter)
        }
        else{
            return s
        }
    }
    else if (typeof (res as any).then == 'function'){
        (res as Promise<Action<S>>).then(a => executeAction(setter, a))
        return s
    }
    else if (typeof res == 'function'){
            return handleRes(s, res(s), setter)
    }
    else{
        return merge(s, res as Partial<S>)
    }
}

export const executeAction = <S>(setter: Setter<S>, action: Action<S>) => {
    if (Array.isArray(action)){
        const a = action.shift()
        if(a){
            executeAction(setter, a)
            executeAction(setter, action)
        }
    }
    else if (typeof (action as any).then == 'function'){
        (action as Promise<Action<S>>).then(a => executeAction(setter, a))
    }
    else if (typeof action == 'function'){
        setter(s => {
            const res = action(s)
            return handleRes(s, res, setter)
        })
    }
    else{
        setter(s => merge(s, action as Partial<S>))
    }
}

export const bindAction = <S, Args extends any[]>(setter: Setter<S>, action: UnboundAction<S, Args>) => 
    (...args: Args) => 
        executeAction(setter, action(...args))

export type All<T> = {
    [P: string]: T;
}

export const objectMap = (object: object, mapFn: (p: object[(keyof object)]) => any): object =>
    Object.keys(object).reduce(function(result, key) {
        (result as any)[key] = mapFn(object[key as never])
        return result as any
    }, {})

export const bindActions = <S, Acts extends All<UnboundAction<S, any[]>>>(setter: Setter<S>, actions: Acts): BoundActions<Acts> =>
    objectMap(actions, (action) => bindAction(setter, action)) as any

export type BoundActions<T> = {
    [P in keyof T]:
        T[P] extends UnboundAction<infer S, infer Args> ?
            (...args: Args) => unknown
        : never
}