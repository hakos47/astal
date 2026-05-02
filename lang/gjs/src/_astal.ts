/* prettier-ignore */
import Variable from "./variable.js"
import { execAsync } from "./process.js";
import Binding, {
  Connectable,
  kebabify,
  snakeify,
  Subscribable,
} from "./binding.js";

export const noImplicitDestroy = Symbol("no no implicit destroy");
export const setChildren = Symbol("children setter method");
/* prettier-ignore */
export function mergeBindings(array: any[]) {
    function getValues(...args: any[]) {
        let i = 0
        return array.map(value => value instanceof Binding
            ? args[i++]
            : value,
        )
    }

    const bindings = array.filter(i => i instanceof Binding)

    if (bindings.length === 0)
        return array

    if (bindings.length === 1)
        return bindings[0].as(getValues)

    return Variable.derive(bindings, getValues)()
}
/* prettier-ignore */
export function setProp(obj: any, prop: string, value: any) {
    try {
        const setter = `set_${snakeify(prop)}`
        if (typeof obj[setter] === "function")
            return obj[setter](value)

        return (obj[prop] = value)
    } catch (error) {
        console.error(`could not set property "${prop}" on ${obj}:`, error)
    }
}
/* prettier-ignore */
export type BindableProps<T> = {
    [K in keyof T]: Binding<T[K]> | T[K];
}
/* prettier-ignore */
export function hook<Widget extends Connectable>(
    widget: Widget,
    object: Connectable | Subscribable,
    signalOrCallback: string | ((self: Widget, ...args: any[]) => void),
    callback?: (self: Widget, ...args: any[]) => void,
) {
    if (typeof object.connect === "function" && callback) {
        const id = object.connect(signalOrCallback, (_: any, ...args: unknown[]) => {
            return callback(widget, ...args)
        })
        widget.connect("destroy", () => {
            (object.disconnect as Connectable["disconnect"])(id)
        })
    } else if (typeof object.subscribe === "function" && typeof signalOrCallback === "function") {
        const unsub = object.subscribe((...args: unknown[]) => {
            signalOrCallback(widget, ...args)
        })
        widget.connect("destroy", unsub)
    }
}
/* prettier-ignore */
/* ~/test-wayland/astal/lang/gjs/src/_astal.ts */

export function construct(widget: any, props: any) {
    // 1. DESESTRUCTURACIÓN COMPLETA: Extraemos 'child' para evitar ReferenceError
    const { child, children: initialChildren, setup, ...rest } = props;

    // 2. NORMALIZACIÓN ATÓMICA DE HIJOS: Previene 'children.flat is not a function'
    // Convertimos cualquier entrada (null, undefined, objeto único o array) en un array real.
    let children: any[] = Array.isArray(initialChildren)
        ? initialChildren
        : (initialChildren ? [initialChildren] : []);

    // 3. INTEGRACIÓN DE HIJO ÚNICO (Patrón JSX)
    if (child) {
        children.unshift(child);
    }

    // 4. LIMPIEZA DE 'rest' (Evitamos procesar children/setup como propiedades de GObject)
    for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) {
            delete rest[key];
        }
    }

    // 5. RECOLECCIÓN DE BINDINGS
    const bindings: Array<[string, Binding<any>]> = Object
        .keys(rest)
        .reduce((acc: any, prop) => {
            if (rest[prop] instanceof Binding) {
                const binding = rest[prop];
                delete rest[prop];
                return [...acc, [prop, binding]];
            }
            return acc;
        }, []);

    // 6. RECOLECCIÓN DE SEÑALES (onEvent)
    const onHandlers: Array<[string, string | (() => unknown)]> = Object
        .keys(rest)
        .reduce((acc: any, key) => {
            if (key.startsWith("on")) {
                const sig = kebabify(key).split("-").slice(1).join("-");
                const handler = rest[key];
                delete rest[key];
                return [...acc, [sig, handler]];
            }
            return acc;
        }, []);

    // 7. RENDERIZADO DE HIJOS Y REACTIVIDAD
    // Usamos el array ya normalizado 'children', garantizando que .flat() funcione.
    const mergedChildren = mergeBindings(children.flat(Infinity));
    if (mergedChildren instanceof Binding) {
        widget[setChildren](mergedChildren.get());
        widget.connect("destroy", mergedChildren.subscribe((v) => {
            widget[setChildren](v);
        }));
    } else if (Array.isArray(mergedChildren) && mergedChildren.length > 0) {
        widget[setChildren](mergedChildren);
    }

    // 8. CONFIGURACIÓN DE SEÑALES
    for (const [signal, callback] of onHandlers) {
        const sig = signal.startsWith("notify")
            ? signal.replace("-", "::")
            : signal;

        if (typeof callback === "function") {
            widget.connect(sig, callback);
        } else {
            widget.connect(sig, () => execAsync(callback as string)
                .then(print).catch(console.error));
        }
    }

    // 9. CONFIGURACIÓN DE BINDINGS DE PROPIEDADES
    for (const [prop, binding] of bindings) {
        if (prop === "child" || prop === "children") {
            widget.connect("destroy", binding.subscribe((v: any) => {
                widget[setChildren](v);
            }));
        }
        widget.connect("destroy", binding.subscribe((v: any) => {
            setProp(widget, prop, v);
        }));
        setProp(widget, prop, binding.get());
    }

    // 10. ASIGNACIÓN FINAL Y SETUP
    // Asignamos solo las propiedades restantes puras (rest)
    Object.assign(widget, rest);

    if (typeof setup === "function") {
        setup(widget);
    }

    return widget;
}
/* prettier-ignore */
function isArrowFunction(func: any): func is (args: any) => any {
    // REPARACIÓN: Si es un widget astalificado, queremos que sea tratado como función.
    return !Object.prototype.hasOwnProperty.call(func, "prototype") || func.prototype === undefined;
}
/* prettier-ignore */
export function jsx(
    ctors: Record<string, { new(props: any): any } | ((props: any) => any)>,
    ctor: string | ((props: any) => any) | { new(props: any): any },
    { children, ...props }: any,
) {
    children ??= []

    if (!Array.isArray(children))
        children = [children]

    children = children.filter(Boolean)

    if (children.length === 1)
        props.child = children[0]
    else if (children.length > 1)
        props.children = children

    if (typeof ctor === "string") {
        if (isArrowFunction(ctors[ctor]))
            return ctors[ctor](props)

        return new ctors[ctor](props)
    }

    if (isArrowFunction(ctor))
        return ctor(props)

    return new ctor(props)
}

export let currentContext = null;
export function context(ctx, cb) {
    const prev = currentContext;
    currentContext = ctx;
    try { return cb(); } finally { currentContext = prev; }
}
