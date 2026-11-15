// Remote photography (Unsplash CDN). Every image is rendered through
// <SmartImage>, which falls back to an art-directed gradient if it fails.
const u = (id, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=78`

export const img = {
  rainforest: u('1511497584788-876760111969'),
  forest: u('1441974231531-c6227db76b6e'),
  ocean: u('1505118380757-91f5f5632de0'),
  wave: u('1518837695005-2083093ee35b'),
  turtle: u('1437622368342-7a3d73a34c8f'),
  mountains: u('1506905925346-21bda4d32df4'),
  peak: u('1464822759023-fed622ff2c3b'),
  alps: u('1454496522488-7a8e488e8606'),
  desert: u('1509316785289-025f5b846b35'),
  dunes: u('1473580044384-7ba9967e16a0'),
  polar: u('1589656966895-2f33e7653819'),
  aurora: u('1531366936337-7c912a4589a7'),
  grassland: u('1500382017468-9049fed747ef'),
  hills: u('1472214103451-9374bd1c798e'),
  lion: u('1546182990-dffeafbe841d', 1000),
  fox: u('1474511320723-9a56873867b5', 1000),
  tiger: u('1561731216-c3a4d99437d5', 1000),
  bird: u('1444464666168-49d633b86797', 1000),
  deer: u('1484406566174-9da000fda645', 1000),
  elephant: u('1557050543-4d5f4e07ef46', 1000),
  earth: u('1614730321146-b6fa6a46bcb4'),
  network: u('1451187580459-43490279c0fa'),
  city: u('1477959858617-67f85cf4f1df', 1000),
  farm: u('1500937386664-56d1dfef3854', 1000),
  community: u('1488521787991-ed7bbaae773c', 1000),
  waterfall: u('1432405972618-c60b0225b8f9'),
  lake: u('1439066615861-d1af74d74000'),
  fog: u('1470071459604-3b5ec3a7fe05'),
  sunrise: u('1469474968028-56623f02e42e'),
  valley: u('1426604966848-d7adac402bff'),
}

// gradient fallbacks keyed by mood
export const tones = {
  forest: 'radial-gradient(120% 90% at 30% 20%, #3f7a4f 0%, #123b2a 45%, #050807 100%)',
  ocean: 'radial-gradient(120% 90% at 70% 10%, #2a8fc4 0%, #0b5d91 40%, #031522 100%)',
  mountain: 'radial-gradient(120% 90% at 50% 0%, #e9e4d6 0%, #6d7f8c 40%, #121a20 100%)',
  desert: 'radial-gradient(120% 90% at 60% 20%, #f0c987 0%, #c9a96e 35%, #4a2e16 100%)',
  polar: 'radial-gradient(120% 90% at 40% 10%, #f4f7f2 0%, #9cc7da 40%, #0d2433 100%)',
  grass: 'radial-gradient(120% 90% at 50% 10%, #e7d38f 0%, #7f9a4a 40%, #1d2a12 100%)',
  space: 'radial-gradient(120% 90% at 50% 50%, #0b5d91 0%, #071a26 45%, #050807 100%)',
  wild: 'radial-gradient(120% 90% at 40% 30%, #c9a96e 0%, #5b4425 45%, #120c06 100%)',
  city: 'radial-gradient(120% 90% at 50% 80%, #c9a96e 0%, #2a2f4a 40%, #050807 100%)',
}
