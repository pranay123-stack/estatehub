/**
 * A real 64x48 RGB JPEG, inlined so the suite needs no binary fixture on disk.
 * Deliberately a normal photo-shaped image: a 1x1 or greyscale JPEG is an edge
 * case Next's image optimiser handles differently and would test the wrong thing.
 */
export const SAMPLE_JPEG = Buffer.from(
          "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/" +
          "2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAAR" +
          "CAAwAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAA" +
          "AAAAAAAAAAAAAAQG/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AiwFzDgAAAAAAAAAAAAAAAAAAAAAP/9k=",
  "base64",
);
