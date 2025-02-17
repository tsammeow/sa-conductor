import { IPlugin } from "..";
import { AbstractPluginClass, PluginClass } from "../types";

/**
 * Typechecking utility decorator.
 * It is recommended that usage of this decorator is removed
 * before or during the build process.
 * @param _pluginClass The Class to be typechecked.
 */
export function checkIsPluginClass<Arg extends any[] = [], T = IPlugin>(_pluginClass: PluginClass<Arg, T> | AbstractPluginClass<Arg, T>) {
}
