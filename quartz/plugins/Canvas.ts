import { QuartzTransformerPlugin } from "quartz/plugins/types"

export const CanvasPlugin: QuartzTransformerPlugin = () => ({
  name: "Canvas",
  textTransform(_ctx, src) {
    if (src.endsWith(".canvas")) {
      return {
        data: `<div id="canvas-container" data-canvas='${JSON.stringify(src)}'></div>`,
      }
    }
    return undefined
  },
})