import Gtk from "gi://Gtk?version=4.0";
import { type BindableChild } from "./astalify.js";
// REPARACIÓN: Importamos las herramientas de contexto del core de Astal
import {
  mergeBindings,
  jsx as _jsx,
  context,
  currentContext,
} from "../_astal.js";
import * as Widget from "./widget.js";

type AstalComponent<P> = (props: P) => Gtk.Widget;

export function Fragment({ children = [], child }: any): any {
    if (child) children.push(child);

    // REPARACIÓN KITSUNE: Código limpio sin etiquetas de editor
    const arr = Array.isArray(children) ? children : (children ? [children] : []);
    return mergeBindings(arr.flat(Infinity));
}

/**
 * JSX Factory especializado para GTK4
 * Intercepta componentes funcionales para forzar la creación de contexto
 */
export function jsx(ctor: any, inprops: any, key: any): any {
     // REPARACIÓN KITSUNE: Extraemos setup para proteger el motor nativo
     const { $, $type, $constructor, children, setup, ...rest } = inprops;
     const props = rest;
     if (key) props.key = key;

     // 1. Manejo de strings (ej: <box />)
     if (typeof ctor === "string") {
         if (ctor in ctors) {
             ctor = (ctors as any)[ctor];
         } else {
             throw Error(`Kitsune-Engine: Unknown element "${ctor}"`);
         }
     }

     // 2. Identificar si es un Componente Funcional (como NetworkPopup)
     // En GJS, los Widgets nativos heredan de Gtk.Widget y tienen prototipo.
     // Las funciones de flecha NO tienen prototipo.
     const isFunctional = typeof ctor === "function" && !ctor.prototype;

     if (isFunctional) {
         // Si es funcional, lo llamamos directamente pasando props y children
         // Usamos el contexto para mantener la reactividad de Astal
         return context({ cleanups: [] }, () => ctor({ ...props, children, setup }));
     }

     // 3. Si es una clase (Widget nativo), usamos 'new'
     const widget = new ctor(props);

     // Aplicamos el setup manualmente al final
     if (setup && typeof setup === "function") {
         setup(widget);
     }

     return widget;
}

const ctors = {
  box: Widget.Box,
  button: Widget.Button,
  centerbox: Widget.CenterBox,
  entry: Widget.Entry,
  image: Widget.Image,
  label: Widget.Label,
  levelbar: Widget.LevelBar,
  overlay: Widget.Overlay,
  revealer: Widget.Revealer,
  slider: Widget.Slider,
  stack: Widget.Stack,
  switch: Widget.Switch,
  window: Widget.Window,
  menubutton: Widget.MenuButton,
  popover: Widget.Popover,
  // REPARACIÓN: Registro del contenedor de scroll
  scrolledwindow: Widget.ScrolledWindow,
};

declare global {
  namespace JSX {
    type Element = Gtk.Widget;
    type ElementClass = Gtk.Widget;
    interface IntrinsicElements {
      box: Widget.BoxProps;
      button: Widget.ButtonProps;
      centerbox: Widget.CenterBoxProps;
      entry: Widget.EntryProps;
      image: Widget.ImageProps;
      label: Widget.LabelProps;
      levelbar: Widget.LevelBarProps;
      overlay: Widget.OverlayProps;
      revealer: Widget.RevealerProps;
      slider: Widget.SliderProps;
      stack: Widget.StackProps;
      switch: Widget.SwitchProps;
      window: Widget.WindowProps;
      menubutton: Widget.MenuButtonProps;
      popover: Widget.PopoverProps;
      scrolledwindow: any;
    }
  }
}

/**
 * Registra funciones de limpieza
 * Si el contexto es nulo, evita el crash emitiendo un warning
 */
export function onCleanup(cleanup: () => void) {
  if (currentContext) {
    currentContext.cleanups.push(cleanup);
  } else {
    // REPARACIÓN: Bypass de seguridad para evitar el cierre forzado de Kitsune OS[cite: 2]
    console.warn(
      "Astal Tracking: onCleanup called outside of context. Cleanup ignored to prevent crash.",
    );
  }
}

export const jsxs = jsx;
