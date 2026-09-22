import { restoreScrollPositions, SNAPSHOT_PADDING } from './window-snapshot'
import type { ScrollPosition } from './window-snapshot'

export type GenieRect = { left: number; top: number; width: number; height: number }

export const GENIE_MINIMIZE_DURATION = 450
export const GENIE_RESTORE_DURATION = 450

export function smoothStep(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

type GenieEffect = {
  draw: (source: GenieRect, target: GenieRect, progress: number, opacity: number) => void
  dispose: () => void
}

type WebGLSurface = {
  upload: (image: HTMLCanvasElement) => void
  draw: GenieEffect['draw']
  hide: () => void
  isAvailable: () => boolean
  destroy: () => void
}

const idleWebGLSurfaces: WebGLSurface[] = []
let surfacePoolDisposed = false

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    surfacePoolDisposed = true
    idleWebGLSurfaces.forEach((surface) => surface.destroy())
    idleWebGLSurfaces.length = 0
  })
}

const vertexShader = `
  precision highp float;
  attribute vec2 a_position;
  uniform vec2 u_viewport;
  uniform vec4 u_source;
  uniform vec4 u_target;
  uniform float u_progress;
  varying vec2 v_uv;

  void main() {
    // The lower edge reaches the Dock first. The upper edge follows later,
    // pulling each textured row through the curved, narrowing neck.
    float pull = smoothstep(0.0, 0.62, u_progress);
    float swallow = smoothstep(0.24, 1.0, u_progress);
    float row = smoothstep(0.0, 1.0, a_position.y);
    float bend = mix(swallow, pull, row);
    float left = mix(u_source.x, u_target.x, bend);
    float width = mix(u_source.z, u_target.z, bend);
    float top = mix(u_source.y, u_target.y, swallow);
    float bottom = mix(u_source.y + u_source.w, u_target.y + u_target.w, pull);
    vec2 position = vec2(left + a_position.x * width, mix(top, bottom, a_position.y));
    vec2 clip = position / u_viewport * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_position;
  }
`

const fragmentShader = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform float u_opacity;
  varying vec2 v_uv;

  void main() {
    gl_FragColor = texture2D(u_texture, v_uv) * u_opacity;
  }
`

function padded(rect: GenieRect, width: number, height: number): GenieRect {
  const x = SNAPSHOT_PADDING * rect.width / width
  const y = SNAPSHOT_PADDING * rect.height / height
  return {
    left: rect.left - x,
    top: rect.top - y,
    width: rect.width + x * 2,
    height: rect.height + y * 2,
  }
}

function createWebGLSurface(): WebGLSurface | null {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;left:0;top:0;display:block;visibility:hidden;opacity:0;background:transparent;pointer-events:none;z-index:2147483646;'
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
  })
  if (!gl) return null

  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null
  let vertices: WebGLBuffer | null = null
  let indices: WebGLBuffer | null = null
  let texture: WebGLTexture | null = null
  let bounds: GenieRect | null = null
  const hide = () => {
    canvas.style.opacity = '0'
    canvas.style.visibility = 'hidden'
  }
  const onContextLost = () => { hide() }
  canvas.addEventListener('webglcontextlost', onContextLost)
  const destroy = () => {
    hide()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.remove()
    gl.deleteBuffer(vertices)
    gl.deleteBuffer(indices)
    gl.deleteTexture(texture)
    gl.deleteProgram(program)
    shaders.forEach((shader) => gl.deleteShader(shader))
  }

  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to allocate a WebGL shader')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Unable to compile the genie shader')
      }
      return shader
    }

    program = gl.createProgram()
    if (!program) throw new Error('Unable to allocate a WebGL program')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Unable to link the genie shader')
    }
    gl.useProgram(program)

    const columns = 24
    const rows = 96
    const points: number[] = []
    const triangles: number[] = []
    for (let y = 0; y <= rows; y += 1) {
      for (let x = 0; x <= columns; x += 1) points.push(x / columns, y / rows)
    }
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const a = y * (columns + 1) + x
        const b = a + columns + 1
        triangles.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }

    vertices = gl.createBuffer()
    indices = gl.createBuffer()
    texture = gl.createTexture()
    if (!vertices || !indices || !texture) throw new Error('Unable to allocate the genie mesh')
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    const viewport = gl.getUniformLocation(program, 'u_viewport')
    const sourceUniform = gl.getUniformLocation(program, 'u_source')
    const targetUniform = gl.getUniformLocation(program, 'u_target')
    const progressUniform = gl.getUniformLocation(program, 'u_progress')
    const opacityUniform = gl.getUniformLocation(program, 'u_opacity')

    return {
      upload(image) {
        hide()
        bounds = null
        if (gl.isContextLost()) throw new Error('The WebGL context was lost')
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Unable to upload the window texture')
      },
      draw(source, target, progress, opacity) {
        if (gl.isContextLost()) throw new Error('The WebGL context was lost')
        // Every vertex stays between the source and destination rectangles.
        // Keep the surface within that area, and only grow it during a flight.
        // It can no longer cover the whole desktop with an unpainted frame.
        const left = Math.max(0, Math.floor(Math.min(source.left, target.left, bounds?.left ?? Infinity)))
        const top = Math.max(0, Math.floor(Math.min(source.top, target.top, bounds?.top ?? Infinity)))
        const right = Math.min(window.innerWidth, Math.ceil(Math.max(
          source.left + source.width,
          target.left + target.width,
          bounds ? bounds.left + bounds.width : -Infinity,
        )))
        const bottom = Math.min(window.innerHeight, Math.ceil(Math.max(
          source.top + source.height,
          target.top + target.height,
          bounds ? bounds.top + bounds.height : -Infinity,
        )))
        bounds = { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const canvasWidth = Math.max(1, Math.round(bounds.width * dpr))
        const canvasHeight = Math.max(1, Math.round(bounds.height * dpr))
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          hide()
          if (canvas.width !== canvasWidth) canvas.width = canvasWidth
          if (canvas.height !== canvasHeight) canvas.height = canvasHeight
        }
        canvas.style.left = `${bounds.left}px`
        canvas.style.top = `${bounds.top}px`
        canvas.style.width = `${bounds.width}px`
        canvas.style.height = `${bounds.height}px`
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.uniform2f(viewport, bounds.width, bounds.height)
        gl.uniform4f(sourceUniform, source.left - bounds.left, source.top - bounds.top, source.width, source.height)
        gl.uniform4f(targetUniform, target.left - bounds.left, target.top - bounds.top, target.width, target.height)
        gl.uniform1f(progressUniform, progress)
        gl.uniform1f(opacityUniform, opacity)
        gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0)
        gl.flush()
        // Attach/reveal only after a transparent, fully drawn frame is ready.
        if (!canvas.isConnected) document.body.append(canvas)
        canvas.style.visibility = 'visible'
        canvas.style.opacity = '1'
      },
      hide,
      isAvailable: () => !gl.isContextLost(),
      destroy,
    }
  } catch {
    destroy()
    return null
  }
}

function acquireWebGLSurface(): WebGLSurface | null {
  let surface = idleWebGLSurfaces.pop()
  while (surface) {
    if (surface.isAvailable()) return surface
    surface.destroy()
    surface = idleWebGLSurfaces.pop()
  }
  return createWebGLSurface()
}

function createWebGL(image: HTMLCanvasElement, width: number, height: number): GenieEffect | null {
  const surface = acquireWebGLSurface()
  if (!surface) return null
  try {
    surface.upload(image)
  } catch {
    surface.destroy()
    return null
  }

  let disposed = false
  return {
    draw(source, target, progress, opacity) {
      if (disposed) return
      surface.draw(padded(source, width, height), padded(target, width, height), progress, opacity)
    },
    dispose() {
      if (disposed) return
      disposed = true
      surface.hide()
      // Reuse the GPU surface instead of losing its context on every click.
      if (!surfacePoolDisposed && surface.isAvailable() && idleWebGLSurfaces.length < 2) idleWebGLSurfaces.push(surface)
      else surface.destroy()
    },
  }
}

function createFallback(preview: HTMLElement, positions: ScrollPosition[], width: number, height: number): GenieEffect {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.inert = true
  host.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none;z-index:2147483646;transform-origin:top left;'
  host.style.width = `${width}px`
  host.style.height = `${height}px`
  const clone = preview.cloneNode(true) as HTMLElement
  Object.assign(clone.style, { left: '0', top: '0', transform: 'none', visibility: 'visible' })
  host.attachShadow({ mode: 'closed' }).append(clone)
  document.body.append(host)
  restoreScrollPositions(clone, positions)

  return {
    draw(source, target, progress, opacity) {
      const t = smoothStep(progress)
      const mix = (a: number, b: number) => a + (b - a) * t
      host.style.transform = `translate(${mix(source.left, target.left)}px, ${mix(source.top, target.top)}px) scale(${mix(source.width, target.width) / width}, ${mix(source.height, target.height) / height})`
      host.style.opacity = String(opacity)
    },
    dispose: () => host.remove(),
  }
}

export function createGenieEffect(
  image: HTMLCanvasElement | null,
  preview: HTMLElement,
  positions: ScrollPosition[],
  width: number,
  height: number,
): GenieEffect {
  let effect: GenieEffect = (image ? createWebGL(image, width, height) : null)
    ?? createFallback(preview, positions, width, height)
  return {
    draw(source, target, progress, opacity) {
      try {
        effect.draw(source, target, progress, opacity)
      } catch {
        effect.dispose()
        effect = createFallback(preview, positions, width, height)
        effect.draw(source, target, progress, opacity)
      }
    },
    dispose: () => effect.dispose(),
  }
}
