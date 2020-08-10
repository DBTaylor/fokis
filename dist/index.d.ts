declare type Focus = {
    kind: "prop";
    name: string | number;
} | {
    kind: "index";
    value: number;
} | {
    kind: "option";
} | {
    kind: "disc";
    name: string;
};
declare type Narrow<T, N> = T extends {
    kind: N;
} ? T : never;
declare type NarrowOption<T> = T extends null ? never : T extends undefined ? never : T;
declare type Events = {
    subscribers: any[];
    children: any;
    discriminants: any;
};
declare type Match<T, U> = [T] extends [{
    kind: string;
}] ? {
    [P in T["kind"]]: (v: View<T & {
        kind: P;
    }>) => U;
} : never;
declare type MapFn<T, U> = [keyof T & number] extends [never] ? never : (v: View<T[keyof T & number]>) => U;
export declare class View<T> {
    data: any;
    events: Events;
    lens: Focus[];
    constructor(data: T, clone?: boolean, events?: any, lens?: Focus[]);
    prop<U extends keyof T & (string | number)>(prop: U): View<T[U]>;
    option(): View<NarrowOption<T>>;
    if<U>(f: (view: View<NarrowOption<T>>) => U): U | null;
    disc<U extends T[keyof T & "kind"] & string>(disc: U): View<Narrow<T, U>>;
    match<U>(fns: Match<T, U>): U;
    index(value: number): View<T[keyof T & number]>;
    map<U>(f: MapFn<T, U>): U[];
    get(): T;
    maybeGet(): {
        success: T;
    } | null;
    modify(f: (s: T) => T): void;
    subscribe(f: (s: T) => unknown): void;
    unsubscribe(f: (s: T) => unknown): void;
}
export {};
