"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var View = /** @class */ (function () {
    function View(data, clone, events, lens) {
        this.data = clone ? data : [data];
        this.events = events ? events : { subscribers: [], children: {}, discriminants: {} };
        this.lens = lens ? lens : [];
        this.prop = this.prop.bind(this);
        this.option = this.option.bind(this);
        this.if = this.if.bind(this);
        this.disc = this.disc.bind(this);
        this.match = this.match.bind(this);
        this.index = this.index.bind(this);
        this.map = this.map.bind(this);
        this.get = this.get.bind(this);
        this.maybeGet = this.maybeGet.bind(this);
        this.modify = this.modify.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
    }
    View.prototype.prop = function (prop) {
        return _prop(prop)(this);
    };
    View.prototype.option = function () {
        return _option(this);
    };
    View.prototype.if = function (f) {
        var value = this.get();
        if (value === undefined)
            return undefined;
        else
            return f(this.option());
    };
    View.prototype.disc = function (disc) {
        return _disc(disc)(this);
    };
    View.prototype.match = function (fns) {
        return fns[this.get().kind](this);
    };
    View.prototype.index = function (value) {
        return _index(value)(this);
    };
    View.prototype.map = function (f) {
        var _this = this;
        return this.get().map(function (_, i) {
            return f(_this.index(i));
        });
    };
    View.prototype.get = function () {
        return _get(this);
    };
    View.prototype.maybeGet = function () {
        return _maybeGet(this);
    };
    View.prototype.modify = function (f) {
        _modify(this, f);
    };
    View.prototype.subscribe = function (f) {
        _subscribe(this, f);
    };
    View.prototype.unsubscribe = function (f) {
        _unsubscribe(this, f);
    };
    return View;
}());
exports.View = View;
var narrowEvents = function (events, lens) {
    var temp = events;
    lens.forEach(function (f) {
        if (f.kind === "prop")
            temp = temp.children[f.name];
        else if (f.kind === "index")
            temp = temp.children[f.value];
        else if (f.kind === "disc")
            temp = temp.discriminants[f.name];
    });
    return temp;
};
var propMap = new WeakMap();
var _prop = function (prop) { return function (view) {
    var cached = propMap.get(view);
    if (cached === undefined) {
        cached = {};
        propMap.set(view, cached);
    }
    else {
        var cached2 = cached[prop];
        if (cached2)
            return cached2;
    }
    var events = narrowEvents(view.events, view.lens);
    if (events.children[prop] === undefined)
        events.children[prop] = { subscribers: [], children: {}, discriminants: {} };
    var newView = new View(view.data, true, view.events, view.lens.concat({ kind: "prop", name: prop }));
    cached[prop] = newView;
    return newView;
}; };
var optionMap = new WeakMap();
var _option = function (view) {
    var cached = optionMap.get(view);
    if (cached) {
        return cached;
    }
    var newView = new View(view.data, true, view.events, view.lens.concat({ kind: "option" }));
    optionMap.set(view, newView);
    return newView;
};
var discMap = new WeakMap();
var _disc = function (disc) { return function (view) {
    var cached = discMap.get(view);
    if (cached === undefined) {
        cached = {};
        discMap.set(view, cached);
    }
    else {
        var cached2 = cached[disc];
        if (cached2)
            return cached2;
    }
    var events = narrowEvents(view.events, view.lens);
    if (events.discriminants[disc] === undefined)
        events.discriminants[disc] = { subscribers: [], children: {}, discriminants: {} };
    var newView = new View(view.data, true, view.events, view.lens.concat({ kind: "disc", name: disc }));
    cached[disc] = newView;
    return newView;
}; };
var indexMap = new WeakMap();
var _index = function (index) { return function (view) {
    var cached = indexMap.get(view);
    if (cached === undefined) {
        cached = {};
        indexMap.set(view, cached);
    }
    else {
        var cached2 = cached[index];
        if (cached2)
            return cached2;
    }
    var events = narrowEvents(view.events, view.lens);
    if (events.children[index] === undefined)
        events.children[index] = { subscribers: [], children: {}, discriminants: {} };
    var newView = new View(view.data, true, view.events, view.lens.concat({ kind: "index", value: index }));
    cached[index] = newView;
    return newView;
}; };
var _get = function (view) {
    var temp = view.data[0];
    view.lens.forEach(function (f) {
        if (f.kind === "prop")
            temp = temp[f.name];
        else if (f.kind === "index")
            temp = temp[f.value];
    });
    return temp;
};
var _maybeGet = function (view) {
    var temp = view.data[0];
    for (var _i = 0, _a = view.lens; _i < _a.length; _i++) {
        var f = _a[_i];
        if (f.kind === "prop")
            temp = temp[f.name];
        else if (f.kind === "index")
            temp = temp[f.value];
        else if (f.kind === "option") {
            if (temp === undefined)
                return undefined;
        }
        else {
            if (f.name !== temp.kind) {
                return undefined;
            }
        }
    }
    return { success: temp };
};
var _rmodify = function (obj, lens, i, fn) {
    var _a;
    while (true) {
        if (i >= lens.length) {
            var old = obj;
            var newObj = fn(obj);
            return [newObj, obj !== newObj, old];
        }
        else {
            var f = lens[i];
            if (f.kind === "prop") {
                var _b = _rmodify(obj[f.name], lens, i + 1, fn), newObj = _b[0], changed = _b[1], old = _b[2];
                return [__assign(__assign({}, obj), (_a = {}, _a[f.name] = newObj, _a)), changed, old];
            }
            else if (f.kind === "index") {
                if (f.value < obj.length) {
                    var _c = _rmodify(obj[f.value], lens, i + 1, fn), newObj = _c[0], changed = _c[1], old = _c[2];
                    return [__spreadArrays(obj.slice(0, f.value), [newObj], obj.slice(f.value + 1)), changed, old];
                }
                else
                    return [obj, false];
            }
            else if (f.kind === "option") {
                if (obj === undefined)
                    return [obj, false];
            }
            else {
                if (obj.kind !== f.name)
                    return [obj, false];
            }
        }
        i++;
    }
};
var _modify = function (view, fn) {
    var _a = _rmodify(view.data[0], view.lens, 0, fn), newObj = _a[0], changed = _a[1], old = _a[2];
    if (changed) {
        view.data[0] = newObj;
        var events_1 = view.events;
        var obj_1 = view.data[0];
        events_1.subscribers.forEach(function (s) { return s(obj_1); });
        view.lens.forEach(function (f) {
            if (f.kind === "prop") {
                events_1 = events_1.children[f.name];
                obj_1 = obj_1[f.name];
                events_1.subscribers.forEach(function (s) { return s(obj_1); });
            }
            else if (f.kind === "index") {
                events_1 = events_1.children[f.value];
                obj_1 = obj_1[f.value];
                events_1.subscribers.forEach(function (s) { return s(obj_1); });
            }
            else if (f.kind === "disc") {
                events_1 = events_1.discriminants[f.name];
                events_1.subscribers.forEach(function (s) { return s(obj_1); });
            }
        });
        if (obj_1 !== undefined)
            notify(narrowEvents(view.events, view.lens), old, obj_1);
    }
};
var notify = function (events, old, nw) {
    var _loop_1 = function (key) {
        var cold = old[key];
        var cnew = nw[key];
        if (cnew !== undefined && cnew !== cold) {
            var cevents = events.children[key];
            cevents.subscribers.forEach(function (s) { return s(cnew); });
            notify(cevents, cold, cnew);
        }
    };
    for (var _i = 0, _a = Object.keys(events.children); _i < _a.length; _i++) {
        var key = _a[_i];
        _loop_1(key);
    }
    for (var _b = 0, _c = Object.keys(events.discriminants); _b < _c.length; _b++) {
        var key = _c[_b];
        var cevents = events.discriminants[key];
        if (nw.kind === key)
            notify(cevents, old, nw);
    }
};
var _subscribe = function (view, f) {
    narrowEvents(view.events, view.lens).subscribers.push(f);
};
var _unsubscribe = function (view, f) {
    var subs = narrowEvents(view.events, view.lens).subscribers;
    subs.splice(subs.findIndex(function (fn) { return fn === f; }));
};
