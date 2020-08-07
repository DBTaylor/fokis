import {View} from '../src/index'

type X = {abc: {kind: "def", def: [number]} | {kind: "ghi", ghi: [string, number]}}

{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const def = view.prop("abc").disc("def").prop("def").index(0)

    test('Test get through discriminated union and props', () => expect(def.get()).toBe(5))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const def = view.prop("abc").disc("def").prop("def").index(0)
    def.modify(n => n + 1)

    test('Test modify through discriminated union and props', () => expect(def.get()).toBe(6))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const def = view.prop("abc").disc("def").prop("def").index(0)
    let x = def.get()
    def.subscribe(n => x = n)
    def.modify(n => n + 1)
    def.modify(n => n + 1)

    test('Test subscribe', () => expect(x).toBe(7))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const def = view.prop("abc").disc("def").prop("def").index(0)
    let x = def.get()
    let y = x
    const fn = (n: number) => x = n
    def.subscribe(n => y = n)
    def.subscribe(fn)
    def.modify(n => n + 1)
    def.unsubscribe(fn)
    def.modify(n => n + 1)

    test('Test unsubscribe', () => expect([x, y]).toStrictEqual([6, 7]))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const def = view.prop("abc").disc("def").prop("def").index(0)
    const def2 = view.prop("abc").disc("def").prop("def").index(0)

    test('Test view cache', () => expect(def).toBe(def2))
}
{
    const view: View<{option?: string}> = new View({option: "abc"})
    const option = view.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe("abc"))
}
{
    const view: View<{option?: string}> = new View({})
    const option = view.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe(null))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const n = view.prop("abc").match({
        "def": x => x.get().def[0],
        "ghi": x => x.get().ghi[1]
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const view: View<X> = new View({abc: {kind: "ghi", ghi: ["abc", 5]}})
    const n = view.prop("abc").match({
        "def": x => x.get().def[0],
        "ghi": x => x.get().ghi[1],
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const view: View<X> = new View({abc: {kind: "def", def: [5]}})
    const n = view.prop("abc").match({
        "def": x => x.prop("def") as View<(number | string)[]>,
        "ghi": x => x.prop("ghi"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["5"]))
}
{
    const view: View<X> = new View({abc: {kind: "ghi", ghi: ["abc", 5]}})
    const n = view.prop("abc").match({
        "def": x => x.prop("def") as View<(number | string)[]>,
        "ghi": x => x.prop("ghi"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["abc", "5"]))
}
{
    const view = new View({abc: 1, def: "abc", ghi: true})
    const abc = view.prop("abc")
    const def = view.prop("def")
    const ghi = view.prop("ghi")
    let x = abc.get()
    let y = def.get()
    let z = ghi.get()
    abc.subscribe(v => x = v)
    def.subscribe(v => y = v)
    ghi.subscribe(v => z = v)
    view.modify(_ => ({abc: 5, def: "", ghi: false}))
    test('Test downstream subscribe', () => expect([x, y, z]).toStrictEqual([5, "", false]))
}
{
    const view = new View({abc: 1, ghi: {ghi: true, def: "abc"}})
    const abc = view.prop("abc")
    const def = view.prop("ghi").prop("def")
    const ghi = view.prop("ghi").prop("ghi")
    let x = abc.get()
    let y = def.get()
    let z = ghi.get()
    let set = false
    abc.subscribe(v => x = v)
    def.subscribe(v => {y = v; set = true})
    ghi.subscribe(v => z = v)
    view.modify(_ => ({abc: 5, ghi: {def: "abc", ghi: false}}))
    test('Test downstream subscribe', () => expect([x, y, z, set]).toStrictEqual([5, "abc", false, false]))
}