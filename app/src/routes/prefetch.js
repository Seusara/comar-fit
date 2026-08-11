export const routeLoaders = {
  connectPartner: () => import('../pages/ConnectPartner'),
  dashboard: () => import('../pages/Dashboard'),
  subirPrueba: () => import('../pages/SubirPrueba'),
  revisarPrueba: () => import('../pages/RevisarPrueba'),
  home: () => import('../pages/Home'),
  perfil: () => import('../pages/Perfil'),
  rutina: () => import('../pages/Rutina'),
  duelo: () => import('../pages/Duelo'),
};

const loadersByPath = {
  '/': routeLoaders.home,
  '/connect-partner': routeLoaders.connectPartner,
  '/dashboard': routeLoaders.dashboard,
  '/rutina': routeLoaders.rutina,
  '/duelo': routeLoaders.duelo,
  '/subir-prueba': routeLoaders.subirPrueba,
  '/revisar-prueba': routeLoaders.revisarPrueba,
  '/perfil': routeLoaders.perfil,
};

export function preloadRoute(path) {
  loadersByPath[path]?.();
}
