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

export function Fragment({
  children = [],
  child,
}: {
  child?: BindableChild;
  children?: Array<BindableChild>;
}) {
  if (child) children.push(child);
  return mergeBindings(children);
}

/**
 * JSX Factory especializado para GTK4
 * Intercepta componentes funcionales para forzar la creación de contexto
 */
export function jsx<P extends object>(
  ctor: keyof typeof ctors | typeof Gtk.Widget | AstalComponent<P>,
  props: P,
) {
  if (typeof ctor === "function" && !(ctor.prototype instanceof Gtk.Widget)) {
    // Es un componente funcional (ej: Island)
    return context(() => (ctor as AstalComponent<P>)(props));
  }

  // Es un widget intrínseco astalificado
  return _jsx(ctors, ctor as any, props);
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
