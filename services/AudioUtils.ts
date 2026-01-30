
/**
 * AudioUtils: Utilidades de bajo nivel para manejo de buffers de audio.
 */

/**
 * Garantiza que obtenemos un ArrayBuffer puro a partir de una vista Float32Array.
 * Útil para evitar errores de SharedArrayBuffer en APIs que no los soportan.
 */
export function toArrayBuffer(view: Float32Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = view;

  // Si ya es un ArrayBuffer estándar y no está desplazado, lo usamos directamente (clonado)
  if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) {
    return buffer.slice(0);
  }

  // Caso general: Creamos un buffer nuevo y copiamos los bytes exactos
  const clone = new ArrayBuffer(byteLength);
  new Uint8Array(clone).set(
    new Uint8Array(buffer, byteOffset, byteLength)
  );
  return clone;
}

/**
 * Convierte un ArrayBuffer de vuelta a Float32Array de forma segura.
 */
export function fromArrayBuffer(buffer: ArrayBuffer): Float32Array {
  return new Float32Array(buffer);
}
