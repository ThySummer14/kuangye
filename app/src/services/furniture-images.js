// Keep thumbnail GPU code out of the application shell and text-only pages.
let loaded, pending;
export function loadFurnitureImages() {
  return pending ||= import('../scenes/furniture.js').then(module => (loaded = module)).catch(error => { pending = null; throw error; });
}
export function disposeFurnitureImages() { loaded?.disposeThumbnails(); }
