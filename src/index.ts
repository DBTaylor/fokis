
type Focus =
    | {kind: "prop", name: string}
    | {kind: "index", value: number}
    | {kind: "option"}
    | {kind: "disc", name: string}

class View<T>{
    data: any
    events: any
    lens: Focus[]
    constructor(data: T, clone?: boolean, events?: any, lens?: Focus[]){
        this.data = clone ? data : [data]
        this.events = events ? events : {subscribers: [], children: {}}
        this.lens = lens ? lens : []
    }

    prop<U extends keyof T & string>(prop: U): View<T[U]>{
        return _prop(prop)(this) as View<T[U]>
    }

    option(): View<NarrowOption<T>>{
        return _option(this) as View<NarrowOption<T>>
    }

    disc<U extends T[keyof T & "kind"] & string >(disc: U): View<Narrow<T, U>>{
        return _disc(disc)(this as any) as View<Narrow<T, U>>
    }

    index<U extends T[keyof T & number]>(value: number): View<U>{
        return _index(value)(this as any) as View<U>
    }

    get(){
        return _get(this)
    }

    mget(){
        return _mget(this)
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

type UnknownView<U> = [unknown] extends [U] ? unknown : [U] extends [never] ? unknown : View<U>;
type Narrow<T, N> = T extends { kind: N } ? T : never;
type NarrowOption<T> = T extends null ? never : T extends undefined ? never : T

var propMap = new WeakMap()
const _prop = <T extends string>(prop: T) => <U>(view: View<{[P in T]: U}>) => {
    var cached = propMap.get(view)
    if(cached === undefined){
        cached = {}
        propMap.set(view, cached)
    }
    else{
        var cached2 = cached[prop]
        if(cached2)
            return cached2 as UnknownView<U>
    }
    let events = narrow(view.events, view.lens)
    if (events.children[prop] === undefined)
        events.children[prop] = {subscribers: [], children: {}}
    let newView = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "prop", name: prop})
    ) as UnknownView<U>
    cached[prop] = newView
    return newView 
}

var optionMap = new WeakMap()
const _option = <T>(view: View<T | null | undefined>) => {
    var cached = optionMap.get(view)
    if(cached){
        return cached as View<T>
    }
    let newView = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "option"})
     ) as View<T>
    optionMap.set(view, newView)
    return newView 
}

const _disc = <T extends string>(disc: T) => <V>(view: View<V & {kind: T}>) => {
    var cached = propMap.get(view)
    if(cached === undefined){
        cached = {}
        propMap.set(view, cached)
    }
    else{
        var cached2 = cached[disc]
        if(cached2)
            return cached2 as UnknownView<Narrow<V, T>>
    }
    let events = narrow(view.events, view.lens)
    if (events.children[disc] === undefined)
        events.children[disc] = {subscribers: [], children: {}}
    let newView = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "disc", name: disc})
     ) as UnknownView<Narrow<V, T>>
    cached[disc] = newView
    return newView 
}

var indexMap = new WeakMap()
const _index = (index: number) => <T>(view: View<T[]>) => {
    var cached = propMap.get(view)
    if(cached === undefined){
        cached = {}
        propMap.set(view, cached)
    }
    else{
        var cached2 = cached[index]
        if(cached2)
            return cached2 as UnknownView<T>
    }
    let events = narrow(view.events, view.lens)
    if (events.children[index] === undefined)
        events.children[index] = {subscribers: [], children: {}}
    let newView = new View(
        view.data,
        true,
        view.events,
        view.lens.concat({kind: "index", value: index})
     ) as UnknownView<T>
    cached[index] = newView
    return newView 
}

const narrow = (obj: any, lens: Focus[]) => {
    var temp = obj;
    lens.forEach(f => {
        if(f.kind == "prop" || f.kind == "disc")
            temp = temp.children[f.name]
        else if(f.kind == "index")
            temp = temp.children[f.value]
    })
    return temp as {subscribers: any[], children: any}
}

const _get = <T>(view: View<T>) => {
    var temp = view.data[0]
    view.lens.forEach(f => {
        if(f.kind == "prop")
            temp = temp[f.name]
        else if(f.kind == "index")
            temp = temp[f.value]
    })
    return temp as T
}

const _mget = <T>(view: View<T>) => {
    var temp = view.data[0]
    for(var i = 0; i < view.lens.length; i++){
        const f = view.lens[i]
        if(f.kind == "prop")
            temp = temp[f.name]
        else if(f.kind == "index")
            temp = temp[f.value]
        else if(f.kind == "option"){
            if(temp === null || temp === undefined)
                return null
        }
        else{
            if(f.name != temp.kind){
                return null
            }
        }
    }
    return temp as T | null
}

const __modify = <T>(obj: any, lens: Focus[], i: number, fn: (s: any) => any ): any =>{
    while(true){
        if(i >= lens.length){
            const newObj = fn(obj)
            return [fn(obj), obj !== newObj]
        }
        else{
            const f = lens[i]
            if(f.kind == "prop"){
                const [newObj, changed] = __modify(obj[f.name], lens, i + 1, fn)
                return [{...obj, [f.name]: newObj}, changed]
            }
            else if(f.kind == "index"){
                if(f.value < obj.length){
                    const [newObj, changed] = __modify(obj[f.value], lens, i + 1, fn)
                    return [[...obj.slice(0, f.value), newObj, ...obj.slice(f.value + 1)], changed]
                }else
                    return [obj, false]
            }
            else if(f.kind == "option"){
                if(obj === null || obj === undefined)
                    return [obj, false]
            }
            else{
                if(obj.kind != f.name)
                    return [obj, false]
            }
        }
        i++
    }
} 

const _modify = <T>(view: View<T>, f: (s: T) => T) => {
    const [newObj, changed] = __modify(view.data[0], view.lens, 0, f)
    if(changed){
        view.data[0] = newObj
        var events = view.events;
        var obj = view.data[0]
        events.subscribers.forEach((s: any) => s(obj))
        view.lens.forEach(f => {
            if(f.kind == "disc"){
                events = events.children[f.name]
            }
            else if(f.kind == "prop"){
                events = events.children[f.name]
                obj = obj[f.name]
                events.subscribers.forEach((s: any) => s(obj))
            }
            else if(f.kind == "index"){
                events = events.children[f.value]
                obj = obj[f.value]
                events.subscribers.forEach((s: any) => s(obj))
            }
        })
    }
}

const _subscribe = <T>(view: View<T>, f: (s: T) => unknown) =>{
    narrow(view.events, view.lens).subscribers.push(f)
}

const _unsubscribe = <T>(view: View<T>, f: (s: T) => unknown) =>{
    var subs = narrow(view.events, view.lens).subscribers
    subs.splice(subs.findIndex(fn => fn == f))
}

type test = {abc: {kind: "def", def: number[]} | {kind: "54", dedf?: number}}

const view = new View({abc: {kind: "def", def: [5, 1]}} as test)
const abc = view.prop("abc")
abc.subscribe(x => console.log(x))
const g = abc
const d54 = view.prop("abc").disc("54")
const def = view.prop("abc").disc("def").prop("def").index(1)
def.subscribe(n => console.log(n))
def.modify(n => n + 1)
const a = _prop("def")
const b = d54.prop("dedf").option()

console.log(b.mget())
b.modify(n => n + 1)
console.log(b.get())