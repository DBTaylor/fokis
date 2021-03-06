import {View} from '../src/index'

type Data = {object: {kind: "array", array: number[]} | {kind: "tuple", tuple: [string, number]}}

{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const array = view.prop("object").disc("array").prop("array").index(0)

    test('Test get through discriminated union and props', () => expect(array.get()).toBe(5))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const array = view.prop("object").disc("array").prop("array").index(0)
    array.modify(n => n + 1)

    test('Test modify through discriminated union and props', () => expect(array.get()).toBe(6))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const array = view.prop("object").disc("array").prop("array").index(0)
    let x = array.get()
    array.subscribe(n => x = n)
    array.modify(n => n + 1)
    array.modify(n => n + 1)

    test('Test subscribe', () => expect(x).toBe(7))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const array = view.prop("object").disc("array").prop("array").index(0)
    let x = array.get()
    let y = x
    const fn = (n: number) => x = n
    array.subscribe(n => y = n)
    array.subscribe(fn)
    array.modify(n => n + 1)
    array.unsubscribe(fn)
    array.modify(n => n + 1)

    test('Test unsubscribe', () => expect([x, y]).toStrictEqual([6, 7]))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const array = view.prop("object").disc("array").prop("array").index(0)
    const array2 = view.prop("object").disc("array").prop("array").index(0)

    test('Test view cache', () => expect(array).toBe(array2))
}
{
    const view: View<{option?: string}> = new View({option: "object"})
    const option = view.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe("object"))
}
{
    const view: View<{option?: string}> = new View({})
    const option = view.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe(undefined))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const n = view.prop("object").match({
        "array": x => x.get().array[0],
        "tuple": x => x.get().tuple[1]
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const view: View<Data> = new View({object: {kind: "tuple", tuple: ["object", 5]}})
    const n = view.prop("object").match({
        "array": x => x.get().array[0],
        "tuple": x => x.get().tuple[1],
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const view: View<Data> = new View({object: {kind: "array", array: [5]}})
    const n = view.prop("object").match({
        "array": x => x.prop("array") as View<(number | string)[]>,
        "tuple": x => x.prop("tuple"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["5"]))
}
{
    const view: View<Data> = new View({object: {kind: "tuple", tuple: ["abc", 5]}})
    const n = view.prop("object").match({
        "array": x => x.prop("array") as View<(number | string)[]>,
        "tuple": x => x.prop("tuple"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["abc", "5"]))
}
{
    const view = new View({num: 1, str: "abc", bool: true})
    const num = view.prop("num")
    const str = view.prop("str")
    const bool = view.prop("bool")
    let x = num.get()
    let y = str.get()
    let z = bool.get()
    num.subscribe(v => x = v)
    str.subscribe(v => y = v)
    bool.subscribe(v => z = v)
    view.modify(_ => ({num: 5, str: "", bool: false}))
    test('Test downstream subscribe', () => expect([x, y, z]).toStrictEqual([5, "", false]))
}
{
    const view = new View({num: 1, object: {bool: true, str: "abc"}})
    const num = view.prop("num")
    const str = view.prop("object").prop("str")
    const bool = view.prop("object").prop("bool")
    let x = num.get()
    let y = str.get()
    let z = bool.get()
    let set = false
    num.subscribe(v => x = v)
    str.subscribe(v => {y = v; set = true})
    bool.subscribe(v => z = v)
    view.modify(_ => ({num: 5, object: {str: "abc", bool: false}}))
    test('Test downstream subscribe', () => expect([x, y, z, set]).toStrictEqual([5, "abc", false, false]))
}
{
    type Test = {tu: {kind: "number", value: number} | {kind: "string", value: string}}
    const view: View<Test> = new View({tu: {kind: "number", value: 2}})
    const tu = view.prop("tu")
    const str = tu.disc("string").prop("value")
    const num = tu.disc("number").prop("value")
    const either = tu.prop("value")
    let x = str.maybeGet()?.success
    let y = num.get()
    let z = either.get()
    str.subscribe(v => x = v)
    num.subscribe(v => y = v)
    either.subscribe(v => z = v)
    tu.modify(_ => ({kind: "string", value: "abc"}))
    test('Test discriminant subscribes', () => expect([x, y, z]).toStrictEqual(["abc", 2, "abc"]))
}
{
    type Test = {tu: {kind: "number", value: number} | {kind: "string", value: string}}
    const view: View<Test> = new View({tu: {kind: "number", value: 2}})
    const tu = view.prop("tu")
    const str = tu.disc("string").prop("value")
    const num = tu.disc("number").prop("value")
    const either = tu.prop("value")
    let x = str.maybeGet()?.success
    let y = num.get()
    let z = either.get()
    str.subscribe(v => x = v)
    num.subscribe(v => y = v)
    either.subscribe(v => z = v)
    const m = tu.modify
    m(_ => ({kind: "string", value: "abc"}))
    test('Test bind', () => expect([x, y, z]).toStrictEqual(["abc", 2, "abc"]))
}