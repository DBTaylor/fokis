type Focus =
    | {kind: "prop", name: string | number}
    | {kind: "index", value: number}
    | {kind: "option"}
    | {kind: "disc", name: string}


type Narrow<T, N> = T extends { kind: N } ? T : never;
type NarrowOption<T> = T extends null ? never : T extends undefined ? never : T
type Events = {subscribers: any[], children: any}
type Match<T, U> = [T] extends [{kind: string}] ? {[P in T["kind"]]: (v: View<T & {kind: P}>) => U} : never
type MapFn<T, U> = [keyof T & number] extends [never] ? never : (v: View<T[keyof T & number]>) => U

export class View<T>{
    data: any
    events: Events
    lens: Focus[]
    constructor(data: T, clone?: boolean, events?: any, lens?: Focus[]){
        this.data = clone ? data : [data]
        this.events = events ? events : {subscribers: [], children: {}}
        this.lens = lens ? lens : []
    }

    prop<U extends keyof T & (string | number)>(prop: U): View<T[U]>{
        return _prop(prop)(this)
    }

    option(): View<NarrowOption<T>>{
        return _option(this)
    }

    if<U>(f: (view: View<NarrowOption<T>>) => U){
        const value = this.get()
        if(value === undefined || value === null)
            return null
        else
            return f(this.option())
    }

    disc<U extends T[keyof T & "kind"] & string >(disc: U): View<Narrow<T, U>>{
        return _disc(disc)(this as View<any>)
    }

    match<U>(fns: Match<T, U>): U{
        return (fns as any)[(this as any as View<{kind: string}>).get().kind](this)
    }

    index(value: number): View<T[keyof T & number]>{
        return _index(value)(this)
    }

    map<U>(f: MapFn<T, U>): U[]{
        return (this as any as View<any[]>).get().map((_, i) =>
            f((this as any as View<any[]>).index(i))
        )
    }

    get(){
        return _get(this)
    }

    maybeGet(){
        return _maybeGet(this)
    }

    modify(f: (s: T) => T){
        return _modify(this, f)
    }

    subscribe(f: (s: T) => unknown){
        _subscribe(this, f)
    }

    unsubscribe(f: (s: T) => unknown){
        _unsubscribe(this, f)
    }
}

const narrowEvents = (events: Events, lens: Focus[]) => {
    let temp: Events = events;
    lens.forEach(f => {
        if(f.kind === "prop" || f.kind === "disc")
            temp = temp.children[f.name]
        else if(f.kind === "index")
            temp = temp.children[f.value]
    })
    return temp
}

const propMap = new WeakMap()
const _prop = <T extends string | number>(prop: T) => <U>(view: View<{[P in T]: U}>) => {
    let cached = propMap.get(view)
    if(cached === undefined){
        cached = {}
        propMap.set(view, cached)
    }
    else{
        const cached2 = cached[prop]
        if(cached2)
            return cached2 as View<U>
    }
    const events = narrowEvents(view.events, view.lens)
    if(events.children[prop] === undefined)
        events.children[prop] = {subscribers: [], children: {}}
    const newView: View<U> = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "prop", name: prop})
    )
    cached[prop] = newView
    return newView
}

const optionMap = new WeakMap()
const _option = <T>(view: View<T>) => {
    const cached = optionMap.get(view)
    if(cached){
        return cached as View<NarrowOption<T>>
    }
    const newView: View<NarrowOption<T>> = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "option"})
     )
    optionMap.set(view, newView)
    return newView
}

const _disc = <T extends string>(disc: T) => <V>(view: View<V & {kind: T}>) => {
    let cached = propMap.get(view)
    if(cached === undefined){
        cached = {}
        propMap.set(view, cached)
    }
    else{
        const cached2 = cached[disc]
        if(cached2)
            return cached2 as View<Narrow<V, T>>
    }
    const events = narrowEvents(view.events, view.lens)
    if(events.children[disc] === undefined)
        events.children[disc] = {subscribers: [], children: {}}
    const newView: View<Narrow<V, T>> = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "disc", name: disc})
     )
    cached[disc] = newView
    return newView
}

const indexMap = new WeakMap()
const _index = (index: number) => <T>(view: View<T>) => {
    let cached = indexMap.get(view)
    if(cached === undefined){
        cached = {}
        indexMap.set(view, cached)
    }
    else{
        const cached2 = cached[index]
        if(cached2)
            return cached2 as View<T[keyof T & number]>
    }
    const events = narrowEvents(view.events, view.lens)
    if(events.children[index] === undefined)
        events.children[index] = {subscribers: [], children: {}}
    const newView: View<T[keyof T & number]> = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "index", value: index})
     )
    cached[index] = newView
    return newView
}

const _get = <T>(view: View<T>) => {
    let temp = view.data[0]
    view.lens.forEach(f => {
        if(f.kind === "prop")
            temp = temp[f.name]
        else if(f.kind === "index")
            temp = temp[f.value]
    })
    return temp as T
}

const _maybeGet = <T>(view: View<T>) => {
    let temp = view.data[0]
    for (const f of view.lens){
        if(f.kind === "prop")
            temp = temp[f.name]
        else if(f.kind === "index")
            temp = temp[f.value]
        else if(f.kind === "option"){
            if(temp === null || temp === undefined)
                return null
        }
        else{
            if(f.name !== temp.kind){
                return null
            }
        }
    }
    return temp as T | null
}

const _rmodify = <T>(obj: any, lens: Focus[], i: number, fn: (s: any) => any ): any =>{
    while(true){
        if(i >= lens.length){
            const old = obj
            const newObj = fn(obj)
            return [fn(obj), obj !== newObj, old]
        }
        else{
            const f = lens[i]
            if(f.kind === "prop"){
                const [newObj, changed, old] = _rmodify(obj[f.name], lens, i + 1, fn)
                return [{...obj, [f.name]: newObj}, changed, old]
            }
            else if(f.kind === "index"){
                if(f.value < obj.length){
                    const [newObj, changed, old] = _rmodify(obj[f.value], lens, i + 1, fn)
                    return [[...obj.slice(0, f.value), newObj, ...obj.slice(f.value + 1)], changed, old]
                }else
                    return [obj, false]
            }
            else if(f.kind === "option"){
                if(obj === null || obj === undefined)
                    return [obj, false]
            }
            else{
                if(obj.kind !== f.name)
                    return [obj, false]
            }
        }
        i++
    }
}

const _modify = <T>(view: View<T>, fn: (s: T) => T) => {
    const [newObj, changed, old] = _rmodify(view.data[0], view.lens, 0, fn)
    if(changed){
        view.data[0] = newObj
        let events = view.events;
        let obj = view.data[0]
        events.subscribers.forEach((s: any) => s(obj))
        view.lens.forEach(f => {
            if(f.kind === "disc"){
                events = events.children[f.name]
            }
            else if(f.kind === "prop"){
                events = events.children[f.name]
                obj = obj[f.name]
                events.subscribers.forEach((s: any) => s(obj))
            }
            else if(f.kind === "index"){
                events = events.children[f.value]
                obj = obj[f.value]
                events.subscribers.forEach((s: any) => s(obj))
            }
        })
        notify(narrowEvents(view.events, view.lens), old, newObj)
    }
}

const notify = (events: Events, old: any, nw: any) =>{
    for(const key of Object.keys(events.children)){
        const cold = old[key]
        const cnew = nw[key]
        if(cnew !== undefined && cnew !== cold){
            const cevents = events.children[key]
            cevents.subscribers.forEach((s: any) => s(cnew))
            notify(cevents, cold, cnew)
        }
    }
}

const _subscribe = <T>(view: View<T>, f: (s: T) => unknown) =>{
    narrowEvents(view.events, view.lens).subscribers.push(f)
}

const _unsubscribe = <T>(view: View<T>, f: (s: T) => unknown) =>{
    const subs = narrowEvents(view.events, view.lens).subscribers
    subs.splice(subs.findIndex(fn => fn === f))
}